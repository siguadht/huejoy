"""视频理解二创管线：影视解说 / 游戏高光集锦。

流程：ffmpeg 均匀抽帧 → VLM 理解画面内容 → LLM 撰写解说旁白 →
复用 standard 后半段（配图 → TTS → 静态片段 → 拼接）出成片。
"""

import logging
import os
import re
import shutil
import subprocess

from models.llm_client import LLM
from models.vlm_client import VLM

from .api_media import generate_image_api
from .storage import append_artifact, task_output_dir, update_task
from .tts import generate_edge_tts
from .utils import (
    artifact,
    concat_videos,
    copy_input_file,
    create_static_image_clip,
    media_duration_seconds,
    run_blocking,
    write_json,
    write_text,
)
from .standard import build_image_prompt, generate_image_prompts, parse_narrations_response

logger = logging.getLogger(__name__)

DEFAULT_STYLE = "电影感画面，高质量，构图专业"


def _ffprobe_duration(video_path: str) -> float:
    """无 ffprobe 时从 ffmpeg stderr 解析 Duration"""
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("ffmpeg not available")
    proc = subprocess.run(
        [ffmpeg, "-i", video_path],
        capture_output=True, text=True, timeout=60,
    )
    match = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", proc.stderr or "")
    if not match:
        raise RuntimeError(f"Cannot parse video duration: {video_path}")
    hours, minutes, seconds = match.groups()
    return int(hours) * 3600 + int(minutes) * 60 + float(seconds)


def _extract_frames(video_path: str, output_dir: str, count: int) -> list[str]:
    """按视频时长均匀抽 count 帧"""
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("ffmpeg not available")
    duration = _ffprobe_duration(video_path)
    if duration <= 0:
        raise RuntimeError("Invalid video duration")
    interval = duration / (count + 1)
    frames = []
    for idx in range(1, count + 1):
        timestamp = interval * idx
        frame_path = os.path.join(output_dir, f"frame_{idx:02d}.jpg")
        subprocess.run(
            [ffmpeg, "-y", "-v", "quiet", "-ss", f"{timestamp:.2f}", "-i", video_path,
             "-frames:v", "1", "-q:v", "3", frame_path],
            check=True, timeout=60,
        )
        if os.path.exists(frame_path) and os.path.getsize(frame_path) > 0:
            frames.append(frame_path)
    if not frames:
        raise RuntimeError("No frames extracted from video")
    return frames


async def run(task_id: str, params: dict) -> tuple[dict, list[dict]]:
    output_dir = task_output_dir(task_id)
    os.makedirs(output_dir, exist_ok=True)

    video_path = params.get("video_path") or params.get("video_asset")
    if not video_path:
        raise ValueError("video_understand requires video_path")
    video_path = copy_input_file(video_path, output_dir, "input_video")

    vlm_model = params.get("vlm_model")
    if not vlm_model:
        raise ValueError("video_understand requires vlm_model")
    llm_model = params.get("llm_model")
    if not llm_model:
        raise ValueError("video_understand requires llm_model")
    image_model = params.get("image_model")
    if not image_model:
        raise ValueError("video_understand requires image_model")

    scene = params.get("scene") or "commentary"  # commentary=影视解说 / highlight=游戏集锦
    focus_text = (params.get("focus_text") or "").strip()
    segment_count = max(3, min(12, int(params.get("segment_count") or 6)))
    video_ratio = params.get("video_ratio") or "9:16"

    # ---- 1. 抽帧 ----
    update_task(task_id, progress=8, message="Extracting key frames")
    frames = await run_blocking(_extract_frames, video_path, output_dir, 8)
    for idx, frame in enumerate(frames, 1):
        append_artifact(task_id, artifact(frame, "image", f"frame_{idx:02d}"))
    logger.info("Frames extracted: task_id=%s count=%d", task_id, len(frames))

    # ---- 2. VLM 理解 ----
    update_task(task_id, progress=18, message="Understanding video content")
    if scene == "highlight":
        vlm_prompt = (
            "以下是某段游戏录屏的关键帧。请描述：游戏类型、画面中发生了什么、"
            "最精彩的高光时刻出现在哪些帧（按帧序号说明）、整体节奏与氛围。"
            "为短视频集锦解说提供素材，控制在 200 字以内。"
        )
    else:
        vlm_prompt = (
            "以下是某段影视内容的关键帧。请描述：作品类型、剧情主线、"
            "关键情节点（按帧序号说明）、氛围与看点。为解说文案提供素材，控制在 200 字以内。"
        )
    if focus_text:
        vlm_prompt += f"\n用户额外关注：{focus_text}"
    vlm = VLM()
    understanding = await run_blocking(vlm.query, prompt=vlm_prompt, image_paths=frames, model=vlm_model)
    understanding_path = write_text(os.path.join(output_dir, "understanding.txt"), understanding)
    append_artifact(task_id, artifact(understanding_path, "text", "understanding"))
    logger.info("VLM understanding done: task_id=%s chars=%d", task_id, len(understanding))

    # ---- 3. LLM 写解说旁白 ----
    update_task(task_id, progress=30, message="Writing commentary script")
    if scene == "highlight":
        script_prompt = (
            f"根据下面的游戏画面理解，写一条{segment_count}段的高光集锦解说旁白。"
            "语言热血有梗，适合配卡点字幕，每段一句话，总字数 150 字以内。\n"
            f"画面理解：{understanding}"
        )
    else:
        script_prompt = (
            f"根据下面的影视画面理解，写一条{segment_count}段的解说旁白。"
            "开头有悬念钩子，过程讲清剧情，结尾有总结或留白，每段一两句话。\n"
            f"画面理解：{understanding}"
        )
    if focus_text:
        script_prompt += f"\n用户要求侧重：{focus_text}"
    script_prompt += (
        f'\n严格按 JSON 输出，不要输出任何其他内容：{{"narrations": ["第1段", "第2段", ……]}}，'
        f"数组必须恰好 {segment_count} 个元素。"
    )
    llm = LLM()
    response = await run_blocking(llm.query, script_prompt, model=llm_model)
    try:
        narrations = parse_narrations_response(response, segment_count)
    except Exception:
        logger.warning("Commentary JSON parse failed, falling back to sentence split: task_id=%s", task_id)
        import re as _re
        parts = _re.findall(r"[^。！？.!?]+[。！？.!?]?", response.strip())
        narrations = [p.strip() for p in parts if p.strip()][:segment_count]
        if not narrations:
            raise RuntimeError("Failed to generate commentary narration")
    source_text = "\n".join(narrations)
    narration_path = write_text(os.path.join(output_dir, "narration.txt"), source_text)
    append_artifact(task_id, artifact(narration_path, "text", "narration"))

    # ---- 4. 配图提示词 ----
    update_task(task_id, progress=40, message="Generating image prompts")
    style_control = (params.get("style_control") or "").strip()
    if scene == "highlight":
        style_control = (style_control + "，" if style_control else "") + "游戏高光瞬间，动感炫酷，电竞风格"
    else:
        style_control = (style_control + "，" if style_control else "") + "电影质感，剧照风格，氛围感强"
    image_prompts = await generate_image_prompts(narrations, style_control, llm, llm_model)
    if not image_prompts or len(image_prompts) != len(narrations):
        image_prompts = [
            build_image_prompt(narration, style_control, subtitle=narration)
            for narration in narrations
        ]

    storyboard = {
        "title": params.get("title") or "",
        "scene": scene,
        "segment_count": len(narrations),
        "style_control": style_control,
        "frames": [
            {"index": idx + 1, "narration": narration, "image_prompt": image_prompts[idx]}
            for idx, narration in enumerate(narrations)
        ],
    }
    storyboard_path = write_json(os.path.join(output_dir, "storyboard.json"), storyboard)
    append_artifact(task_id, artifact(storyboard_path, "text", "storyboard"))

    # ---- 5. 配图 ----
    images = []
    for idx, prompt in enumerate(image_prompts, 1):
        update_task(
            task_id,
            progress=45 + int(20 * idx / len(image_prompts)),
            message=f"Generating image {idx}/{len(image_prompts)}",
        )
        image_path = await run_blocking(
            generate_image_api,
            prompt=prompt,
            model=image_model,
            output_dir=output_dir,
            task_id=task_id,
            video_ratio=video_ratio,
            resolution=params.get("image_resolution") or "1080P",
        )
        images.append(image_path)
        image_artifact = artifact(image_path, "image", f"image_{idx:02d}")
        append_artifact(task_id, image_artifact)
        storyboard["frames"][idx - 1]["image_path"] = image_path
        write_json(storyboard_path, storyboard)

    # ---- 6. TTS ----
    audios = []
    for idx, narration in enumerate(narrations, 1):
        update_task(
            task_id,
            progress=65 + int(15 * idx / len(narrations)),
            message=f"Generating audio {idx}/{len(narrations)}",
        )
        audio_path = os.path.join(output_dir, f"audio_{idx:02d}.mp3")
        await generate_edge_tts(
            narration,
            output_path=audio_path,
            voice=params.get("tts_voice", "zh-CN-YunjianNeural"),
            speed=float(params.get("tts_speed", 1.0)),
        )
        audios.append(audio_path)
        audio_artifact = artifact(audio_path, "audio", f"audio_{idx:02d}")
        append_artifact(task_id, audio_artifact)
        storyboard["frames"][idx - 1]["audio_path"] = audio_path
        write_json(storyboard_path, storyboard)

    # ---- 7. 静态片段 + 拼接 ----
    videos = []
    for idx, (image_path, audio_path) in enumerate(zip(images, audios), 1):
        update_task(
            task_id,
            progress=80 + int(15 * idx / len(images)),
            message=f"Creating clip {idx}/{len(images)}",
        )
        duration = media_duration_seconds(audio_path) or 3.0
        clip_path = os.path.join(output_dir, f"video_{idx:02d}.mp4")
        await run_blocking(
            create_static_image_clip,
            image_path,
            audio_path,
            clip_path,
            video_ratio=video_ratio,
            duration=duration,
        )
        videos.append(clip_path)
        video_artifact = artifact(clip_path, "video", f"video_{idx:02d}")
        append_artifact(task_id, video_artifact)
        storyboard["frames"][idx - 1]["video_path"] = clip_path
        storyboard["frames"][idx - 1]["duration"] = duration
        write_json(storyboard_path, storyboard)

    final_path = concat_videos(videos, os.path.join(output_dir, "final.mp4"))
    if not final_path:
        raise RuntimeError("video_understand did not produce a final video")
    append_artifact(task_id, artifact(final_path, "video", "final"))

    write_json(storyboard_path, storyboard)
    output = {
        "scene": scene,
        "understanding_path": understanding_path,
        "narration_path": narration_path,
        "storyboard_path": storyboard_path,
        "images": images,
        "audios": audios,
        "videos": videos,
        "final_video": final_path,
    }
    logger.info("video_understand completed: task_id=%s segments=%d", task_id, len(narrations))
    return output, [
        artifact(final_path, "video", "final"),
        artifact(video_path, "video", "input_video"),
    ]
