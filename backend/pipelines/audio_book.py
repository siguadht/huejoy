"""Audio picture-book pipeline: story -> multi-role scenes -> dubbed clips.

Distinct from `standard`:
- The LLM splits the story into scenes with explicit speaker roles (narrator /
  characters), so each role is dubbed with its own edge-tts voice — a real
  multi-role dub instead of one single narrator voice.
- Image prompts are generated per scene with a shared cast description so
  characters stay visually consistent across scenes.
"""

import logging
import os
from typing import Optional

from models.llm_client import LLM

from .api_media import generate_image_api
from .standard import (
    build_image_prompt,
    clamp_segment_count,
    parse_json_object_response,
    split_by_periods,
)
from .storage import append_artifact, task_output_dir, update_task
from .tts import generate_edge_tts
from .utils import (
    artifact,
    concat_videos,
    create_static_image_clip,
    media_duration_seconds,
    render_static_text_image,
    run_blocking,
    write_json,
    write_text,
)

logger = logging.getLogger(__name__)

DEFAULT_STYLE_CONTROL = (
    "温暖绘本插画风，柔和色调，童话氛围，画面简洁治愈，同一角色在不同画面中外观保持一致"
)

NARRATOR_KEYS = {"旁白", "叙述", "讲述", "narrator", "narration", ""}

# MiniMax T2A 音色池（订阅 Key 内含，国内直连，真实多音色——默认引擎）
MINIMAX_VOICE_PRESETS = {
    # 温柔绘本：有声书女声旁白 + 少女/少年角色
    "storybook": {
        "narrator": "audiobook_female_1",
        "cast": [
            "female-shaonv",           # 少女
            "male-qn-qingse",          # 青涩青年
            "female-tianmei-jingpin",  # 甜美女声
            "audiobook_male_1",        # 有声书男声
            "female-yujie",            # 御姐
            "male-qn-jingying",        # 精英青年
        ],
    },
    # 多人剧场：有声书男声旁白 + 角色音色区分度更大
    "theater": {
        "narrator": "audiobook_male_1",
        "cast": [
            "female-shaonv",
            "male-qn-qingse",
            "female-yujie",
            "male-qn-badao",           # 霸道青年
            "female-tianmei-jingpin",
            "audiobook_female_2",
        ],
    },
    # 单旁白：所有文字统一有声书女声
    "solo": {
        "narrator": "audiobook_female_1",
        "cast": ["audiobook_female_1"],
    },
}

# edge-tts 音色池（备用引擎：MiniMax 不可用时走 edge-tts）
VOICE_PRESETS = {
    "storybook": {
        "narrator": "zh-CN-XiaoxiaoNeural",
        "cast": [
            "zh-CN-XiaoshuangNeural",
            "zh-CN-YunxiNeural",
            "zh-CN-XiaoyiNeural",
            "zh-CN-YunjianNeural",
            "zh-CN-XiaomengNeural",
            "zh-CN-YunhaoNeural",
        ],
    },
    "theater": {
        "narrator": "zh-CN-YunjianNeural",
        "cast": [
            "zh-CN-XiaoxiaoNeural",
            "zh-CN-YunxiNeural",
            "zh-CN-XiaohanNeural",
            "zh-CN-YunfengNeural",
            "zh-CN-XiaoshuangNeural",
            "zh-CN-YunyeNeural",
        ],
    },
    "solo": {
        "narrator": "zh-CN-XiaoxiaoNeural",
        "cast": ["zh-CN-XiaoxiaoNeural"],
    },
}


def normalize_speaker(speaker: Optional[str]) -> str:
    name = (speaker or "").strip()
    return name or "旁白"


def is_narrator(speaker: str) -> bool:
    return speaker.strip().lower() in NARRATOR_KEYS


def assign_voices(scenes: list[dict], preset: str, engine: str = "minimax") -> dict:
    """Stable role -> voice map: narrator uses the preset narrator voice,
    each distinct character takes the next unused cast voice."""
    table = MINIMAX_VOICE_PRESETS if engine != "edge" else VOICE_PRESETS
    voices = table.get(preset) or table["storybook"]
    mapping: dict[str, str] = {}
    cast_pool = list(voices["cast"])
    for scene in scenes:
        speaker = normalize_speaker(scene.get("speaker"))
        if speaker in mapping:
            continue
        if is_narrator(speaker):
            mapping[speaker] = voices["narrator"]
        elif cast_pool:
            mapping[speaker] = cast_pool.pop(0)
        else:
            mapping[speaker] = voices["cast"][-1]
    return mapping


def parse_scenes_response(text: str, expected_count: int) -> list[dict]:
    data = parse_json_object_response(text)
    scenes = data.get("scenes") if isinstance(data, dict) else None
    if not isinstance(scenes, list):
        raise ValueError("Model response missing scenes array.")
    parsed: list[dict] = []
    for item in scenes:
        if not isinstance(item, dict):
            continue
        line = str(item.get("line") or item.get("narration") or "").strip()
        if not line:
            continue
        parsed.append({
            "speaker": normalize_speaker(str(item.get("speaker") or "")),
            "line": line,
            "image_prompt": str(item.get("image_prompt") or "").strip(),
        })
    if len(parsed) != expected_count:
        raise ValueError(f"Expected {expected_count} scenes, got {len(parsed)}.")
    return parsed


def fallback_scenes(text: str, count: int) -> list[dict]:
    """Split plain text into `count` narrator scenes when the LLM fails."""
    sentences = split_by_periods(text)
    if not sentences:
        return []
    chunks: list[str] = []
    per = len(sentences) / count
    for i in range(count):
        chunk = sentences[int(i * per): int((i + 1) * per)]
        chunks.append("".join(chunk) or sentences[min(i, len(sentences) - 1)])
    return [
        {"speaker": "旁白", "line": chunk, "image_prompt": ""}
        for chunk in chunks
    ]


async def generate_scenes(
    text: str,
    count: int,
    style_control: str,
    llm: LLM,
    llm_model: str,
) -> tuple[list[dict], str]:
    """Return (scenes, title). Falls back to plain period splitting."""
    prompt = (
        "你是一位儿童绘本编剧。请把下面的故事改编成绘本分镜。\n"
        f"要求：\n"
        f"1. 共 {count} 个场景，按故事顺序覆盖完整情节，每个场景一到两句话。\n"
        "2. 每个场景标注说话角色：旁白用「旁白」，角色用故事中的名字（如「小兔子」）。\n"
        "3. 每个场景给一句英文 image prompt，画面要匹配该情节；同一角色在所有画面中"
        "外观、服装、配色保持一致；画面不要出现任何文字。\n"
        f"4. 整体风格：{style_control}\n"
        "5. 给故事起一个简短中文标题。\n"
        f'严格输出 JSON，不要任何其他内容：{{"title": "...", "scenes": '
        '[{"speaker": "旁白", "line": "...", "image_prompt": "..."}, ...]}}\n\n'
        f"故事原文：\n{text}"
    )
    try:
        response = await run_blocking(llm.query, prompt, model=llm_model)
        scenes = parse_scenes_response(response, count)
        data = parse_json_object_response(response)
        title = str(data.get("title") or "").strip()
        return scenes, title
    except Exception as exc:
        logger.warning(
            "Audio-book scene JSON parse failed, fallback to plain split: error=%s", exc
        )
        return fallback_scenes(text, count), ""


async def run(task_id: str, params: dict) -> tuple[dict, list[dict]]:
    output_dir = task_output_dir(task_id)
    os.makedirs(output_dir, exist_ok=True)

    text = (params.get("text") or "").strip()
    if not text:
        raise ValueError("audio_book pipeline requires text")

    llm_model = params.get("llm_model")
    if not llm_model:
        raise ValueError("audio_book pipeline requires llm_model")
    image_model = params.get("image_model") or params.get("image_t2i_model")
    if not image_model:
        raise ValueError("audio_book pipeline requires image_model")

    segment_count = clamp_segment_count(params.get("segment_count") or 5, default=5)
    video_ratio = params.get("video_ratio") or "9:16"
    style_control = (params.get("style_control") or DEFAULT_STYLE_CONTROL).strip()
    voice_preset = (params.get("voice_preset") or "storybook").strip()
    tts_engine = (params.get("tts_engine") or "minimax").strip()
    tts_speed = float(params.get("tts_speed") or 1.0)

    # ---- 1. LLM 分镜（带角色） ----
    update_task(task_id, progress=6, message="Writing multi-role storyboard")
    llm = LLM()
    scenes, llm_title = await generate_scenes(
        text, segment_count, style_control, llm, llm_model
    )
    if not scenes:
        raise RuntimeError("No storyboard scenes were generated.")

    title = (params.get("title") or "").strip() or llm_title
    if not title:
        title = await run_blocking(
            llm.query,
            f"为下面的绘本故事生成一个简短中文标题，只输出标题：\n{text}",
            model=llm_model,
        )
        title = title.strip().splitlines()[0]

    voice_map = assign_voices(scenes, voice_preset, tts_engine)

    # ---- 2. 图像 prompt（含角色一致性） ----
    image_prompts: list[str] = []
    for scene in scenes:
        visual = scene["image_prompt"] or scene["line"]
        image_prompts.append(build_image_prompt(visual, style_control))

    storyboard = {
        "title": title,
        "voice_preset": voice_preset,
        "tts_engine": tts_engine,
        "style_control": style_control,
        "voice_map": voice_map,
        "frames": [
            {
                "index": idx + 1,
                "speaker": scene["speaker"],
                "voice": voice_map.get(scene["speaker"], ""),
                "line": scene["line"],
                "image_prompt": image_prompts[idx],
            }
            for idx, scene in enumerate(scenes)
        ],
    }
    storyboard_path = write_json(os.path.join(output_dir, "storyboard.json"), storyboard)
    artifacts = [artifact(storyboard_path, "text", "storyboard")]
    for item in artifacts:
        append_artifact(task_id, item)

    # ---- 3. 逐场景出图 ----
    images = []
    for idx, prompt in enumerate(image_prompts, 1):
        update_task(
            task_id,
            progress=10 + int(35 * idx / len(image_prompts)),
            message=f"Generating image {idx}/{len(image_prompts)}",
        )
        image_path = await run_blocking(
            generate_image_api,
            prompt=prompt,
            model=image_model,
            output_dir=output_dir,
            task_id=task_id,
            video_ratio=video_ratio,
        )
        images.append(image_path)
        image_artifact = artifact(image_path, "image", f"image_{idx:02d}")
        artifacts.append(image_artifact)
        append_artifact(task_id, image_artifact)
        storyboard["frames"][idx - 1]["image_path"] = image_path
        write_json(storyboard_path, storyboard)

    # ---- 4. 逐场景多角色配音 ----
    audios = []
    for idx, scene in enumerate(scenes, 1):
        update_task(
            task_id,
            progress=45 + int(20 * idx / len(scenes)),
            message=f"Dubbing {scene['speaker']} {idx}/{len(scenes)}",
        )
        audio_path = os.path.join(output_dir, f"audio_{idx:02d}.mp3")
        await generate_edge_tts(
            scene["line"],
            output_path=audio_path,
            voice=voice_map.get(scene["speaker"], "audiobook_female_1"),
            speed=tts_speed,
            provider=tts_engine,
        )
        audios.append(audio_path)
        audio_artifact = artifact(audio_path, "audio", f"audio_{idx:02d}")
        artifacts.append(audio_artifact)
        append_artifact(task_id, audio_artifact)
        storyboard["frames"][idx - 1]["audio_path"] = audio_path
        write_json(storyboard_path, storyboard)

    # ---- 5. 字幕烧制 + 静态片段 ----
    videos = []
    for idx, (image_path, audio_path) in enumerate(zip(images, audios), 1):
        update_task(
            task_id,
            progress=65 + int(20 * idx / len(images)),
            message=f"Building clip {idx}/{len(images)}",
        )
        duration = media_duration_seconds(audio_path) or 3.0
        captioned_path = os.path.join(output_dir, f"clip_{idx:02d}.jpg")
        clip_image_path = await run_blocking(
            render_static_text_image,
            image_path,
            captioned_path,
            subtitle=scenes[idx - 1]["line"],
            title=title if idx == 1 else None,
            video_ratio=video_ratio,
        )
        video_path = os.path.join(output_dir, f"video_{idx:02d}.mp4")
        await run_blocking(
            create_static_image_clip,
            clip_image_path,
            audio_path,
            video_path,
            video_ratio=video_ratio,
            duration=duration,
        )
        videos.append(video_path)
        video_artifact = artifact(video_path, "video", f"video_{idx:02d}")
        artifacts.append(video_artifact)
        append_artifact(task_id, video_artifact)
        storyboard["frames"][idx - 1]["video_path"] = video_path
        storyboard["frames"][idx - 1]["duration"] = duration
        write_json(storyboard_path, storyboard)

    # ---- 6. 合成成片 ----
    update_task(task_id, progress=88, message="Concatenating clips")
    final_path = concat_videos(videos, os.path.join(output_dir, "final.mp4"))
    if not final_path:
        raise RuntimeError("Audio picture-book generation did not produce a final video.")
    final_artifact = artifact(final_path, "video", "final")
    artifacts.append(final_artifact)
    append_artifact(task_id, final_artifact)

    script_path = write_text(
        os.path.join(output_dir, "script.txt"),
        "\n".join(
            f"[{f['speaker']}|{f['voice']}] {f['line']}" for f in storyboard["frames"]
        ),
    )
    script_artifact = artifact(script_path, "text", "script")
    artifacts.append(script_artifact)
    append_artifact(task_id, script_artifact)

    write_json(storyboard_path, storyboard)
    output = {
        "title": title,
        "voice_preset": voice_preset,
        "tts_engine": tts_engine,
        "voice_map": voice_map,
        "storyboard_path": storyboard_path,
        "images": images,
        "audios": audios,
        "videos": videos,
        "final_video": final_path,
        "frames": storyboard["frames"],
    }
    logger.info(
        "Audio book completed: task_id=%s scenes=%d roles=%d",
        task_id, len(scenes), len(voice_map),
    )
    return output, artifacts
