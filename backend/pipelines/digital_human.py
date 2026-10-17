import os
import re
import logging
import zipfile
from typing import Optional

from models.llm_client import LLM

from .api_media import generate_image_api, generate_video_api
from .api_media import parse_api_workflow
from .storage import append_artifact, task_output_dir, update_task
from .tts import generate_edge_tts
from .utils import (
    artifact,
    concat_audios,
    concat_videos,
    copy_input_file,
    extract_last_frame,
    media_duration_seconds,
    replace_video_audio,
    run_blocking,
    speed_audio_to_duration,
    write_json,
    write_text,
)
from models.config_model import video_capabilities

logger = logging.getLogger(__name__)

# 多语言 TTS 音色映射（edge-tts voice）
LANGUAGE_VOICES = {
    "zh": "zh-CN-YunjianNeural",
    "en": "en-US-GuyNeural",
    "ja": "ja-JP-NanamiNeural",
    "ko": "ko-KR-InJoonNeural",
    "fr": "fr-FR-DeniseNeural",
    "de": "de-DE-KatjaNeural",
    "es": "es-ES-AlvaroNeural",
    "ru": "ru-RU-DmitryNeural",
}
LANGUAGE_NAMES = {
    "zh": "中文", "en": "英语", "ja": "日语", "ko": "韩语",
    "fr": "法语", "de": "德语", "es": "西班牙语", "ru": "俄语",
}


def required_param(params: dict, key: str) -> str:
    value = params.get(key)
    if not value:
        raise ValueError(f"digital_human pipeline requires {key}")
    return str(value)


def split_by_periods(text: str) -> list[str]:
    parts = re.findall(r"[^。．.]+[。．.]?|[^。．.]+$", text.strip())
    return [part.strip() for part in parts if part.strip()]


async def run(task_id: str, params: dict) -> tuple[dict, list[dict]]:
    output_dir = task_output_dir(task_id)
    os.makedirs(output_dir, exist_ok=True)

    mode = params.get("mode") or "customize"
    logger.info("Digital human pipeline started: task_id=%s mode=%s", task_id, mode)
    character_image = params.get("character_image_path") or params.get("character_asset")
    goods_image = params.get("goods_image_path") or params.get("goods_asset")
    goods_title = params.get("goods_title") or ""
    goods_text = params.get("goods_text") or params.get("text") or ""
    if not character_image:
        raise ValueError("digital_human requires character_image_path")
    if mode == "digital" and not goods_image:
        raise ValueError("digital mode requires goods_image_path")
    if mode == "customize" and not goods_text.strip():
        raise ValueError("customize mode requires goods_text")
    if mode == "digital" and not (goods_text.strip() or goods_title.strip()):
        raise ValueError("digital mode requires goods_text or goods_title")

    character_image = copy_input_file(character_image, output_dir, "character")
    if goods_image:
        goods_image = copy_input_file(goods_image, output_dir, "goods")

    # ---- 多语言分支：一条文案输出多语言口播 ----
    languages = [str(lang).strip().lower() for lang in (params.get("languages") or []) if str(lang).strip()]
    if len(languages) > 1:
        if not goods_text.strip():
            raise ValueError("multilingual mode requires goods_text")
        return await _run_multilingual(
            task_id, params, output_dir, character_image, goods_image, goods_title, goods_text, languages,
        )

    llm = LLM()
    llm_model = required_param(params, "llm_model")
    if not goods_text.strip():
        update_task(task_id, progress=15, message="Generating digital-human script")
        logger.info("Generating digital-human script from title: %s", goods_title)
        goods_text = await run_blocking(
            llm.query,
            f"请为商品“{goods_title}”写一段适合数字人口播短视频的中文推广文案。要求自然、有吸引力，控制在80字以内，只输出文案正文。",
            model=llm_model,
        )
    goods_text = goods_text.strip()
    if not goods_title.strip():
        update_task(task_id, progress=18, message="Generating digital-human title")
        logger.info("Generating digital-human title from script: task_id=%s", task_id)
        goods_title = await run_blocking(
            llm.query,
            f"为下面的数字人口播文案生成一个简短中文标题，只输出标题：\n{goods_text}",
            model=llm_model,
        )
        goods_title = goods_title.strip().splitlines()[0]
    logger.info("Digital-human script ready: task_id=%s chars=%d", task_id, len(goods_text))
    script_path = write_text(os.path.join(output_dir, "script.txt"), goods_text)
    append_artifact(task_id, artifact(script_path, "text", "script"))

    generated_image = None
    reference_images = [character_image]
    if mode == "digital" and goods_image:
        reference_images.append(goods_image)
        image_model = required_param(params, "image_model")
        update_task(task_id, progress=30, message="Generating digital-human reference image")
        logger.info("Generating digital-human reference image: model=%s refs=%d", image_model, len(reference_images))
        image_prompt = (
            f"Create a polished vertical digital-human product promotion image. "
            f"Use reference image 1 as the presenter and reference image 2 as the product. "
            f"Make the scene commercial, clean, and suitable for a spoken short video. "
            f"Script: {goods_text}"
        )
        generated_image = await run_blocking(
            generate_image_api,
            prompt=image_prompt,
            model=image_model,
            output_dir=output_dir,
            task_id=task_id,
            image_paths=reference_images,
            video_ratio=params.get("video_ratio") or "9:16",
            resolution=params.get("image_resolution") or "1080P",
        )
        reference_images = [generated_image]
        append_artifact(task_id, artifact(generated_image, "image", "generated_reference"))

    update_task(task_id, progress=62, message="Preparing digital-human video segments")
    video_model = required_param(params, "video_model")
    provider, resolved_video_model = parse_api_workflow(video_model, "video")
    duration_contract = video_capabilities(provider, resolved_video_model).get("duration") or {}
    max_duration = int(duration_contract.get("max") or 10)
    min_duration = int(duration_contract.get("min") or 2)
    segment_seconds = max(min_duration, max_duration)
    narration_sentences = split_by_periods(goods_text) or [goods_text]
    logger.info(
        "Digital-human narration split: task_id=%s sentences=%d model=%s max_segment=%ss",
        task_id,
        len(narration_sentences),
        resolved_video_model,
        segment_seconds,
    )

    audio_segments = []
    audio_segment_texts = []
    audio_artifacts = []
    sentence_audio_paths = []
    for idx, sentence in enumerate(narration_sentences, 1):
        update_task(
            task_id,
            progress=45 + int(15 * idx / max(len(narration_sentences), 1)),
            message=f"Generating narration audio {idx}/{len(narration_sentences)}",
        )
        logger.info(
            "Generating TTS sentence %d/%d: chars=%d",
            idx,
            len(narration_sentences),
            len(sentence),
        )
        sentence_audio_path = os.path.join(output_dir, f"narration_sentence_{idx:02d}.mp3")
        await generate_edge_tts(
            sentence,
            output_path=sentence_audio_path,
            voice=params.get("tts_voice", "zh-CN-YunjianNeural"),
            speed=float(params.get("tts_speed", 1.0)),
        )
        sentence_audio_paths.append(sentence_audio_path)
        sentence_duration = media_duration_seconds(sentence_audio_path)
        if sentence_duration and sentence_duration > segment_seconds:
            logger.info(
                "Sentence audio exceeds model duration; speeding up: sentence=%d duration=%.2fs max=%ss",
                idx,
                sentence_duration,
                segment_seconds,
            )
            sped_audio_path = os.path.join(output_dir, f"narration_sentence_{idx:02d}_speed.mp3")
            sped_audio_path = await run_blocking(
                speed_audio_to_duration,
                sentence_audio_path,
                sped_audio_path,
                segment_seconds,
            )
            audio_segments.append(sped_audio_path)
            audio_segment_texts.append(sentence)
            audio_artifact = artifact(sped_audio_path, "audio", f"narration_sentence_{idx:02d}_speed")
            audio_artifacts.append(audio_artifact)
            append_artifact(task_id, audio_artifact)
        else:
            audio_segments.append(sentence_audio_path)
            audio_segment_texts.append(sentence)
            audio_artifact = artifact(sentence_audio_path, "audio", f"narration_sentence_{idx:02d}")
            audio_artifacts.append(audio_artifact)
            append_artifact(task_id, audio_artifact)

    audio_duration = sum(media_duration_seconds(path) or 0 for path in audio_segments) or None
    logger.info(
        "Digital-human audio prepared: task_id=%s segments=%d total_duration=%s",
        task_id,
        len(audio_segments),
        f"{audio_duration:.2f}s" if audio_duration else "unknown",
    )

    subject_prompt = "参考图中的人物面对镜头自然口播。"
    if mode == "digital":
        subject_prompt += "结合商品信息，生成竖屏商业口播视频。"
    segment_videos = []
    tail_frame = None
    for idx, segment_audio_path in enumerate(audio_segments, 1):
        segment_text = audio_segment_texts[idx - 1] if idx - 1 < len(audio_segment_texts) else goods_text
        prompt = f"{subject_prompt} 口播文案：{segment_text}"
        progress = 65 + int(25 * idx / max(len(audio_segments), 1))
        update_task(
            task_id,
            progress=progress,
            message=f"Calling digital-human video API {idx}/{len(audio_segments)}",
        )
        segment_duration = media_duration_seconds(segment_audio_path) or audio_duration or max_duration
        safe_segment_duration = max(min_duration, min(max_duration, int(round(segment_duration))))
        logger.info(
            "Generating digital-human video segment %d/%d: audio=%s duration=%ss tail_frame=%s",
            idx,
            len(audio_segments),
            segment_audio_path,
            safe_segment_duration,
            bool(tail_frame),
        )
        segment_video_path = os.path.join(output_dir, f"video_part_{idx:02d}.mp4")
        segment_reference_images = [tail_frame] if tail_frame else reference_images
        # 首段无上一段尾帧时，用人物图本身作为视频首帧（wan2.7-i2v 必须有 first_frame 输入）
        segment_first_frame = tail_frame or character_image
        await run_blocking(
            generate_video_api,
            prompt=prompt,
            model=video_model,
            output_path=segment_video_path,
            image_path=segment_first_frame,
            duration=safe_segment_duration,
            video_ratio=params.get("video_ratio") or "9:16",
            reference_image_paths=segment_reference_images,
            reference_audio_path=segment_audio_path,
            audio=True,
            negative_prompt=params.get("negative_prompt"),
            video_resolution=params.get("video_resolution") or params.get("resolution"),
            watermark=params.get("watermark"),
            prompt_extend=params.get("prompt_extend"),
        )
        segment_videos.append(segment_video_path)
        append_artifact(task_id, artifact(segment_video_path, "video", f"video_part_{idx:02d}"))

        if idx < len(audio_segments):
            tail_frame = os.path.join(output_dir, f"tail_frame_{idx:02d}.jpg")
            await run_blocking(extract_last_frame, segment_video_path, tail_frame)
            append_artifact(task_id, artifact(tail_frame, "image", f"tail_frame_{idx:02d}"))

    silent_video_path = segment_videos[0] if len(segment_videos) == 1 else concat_videos(segment_videos, os.path.join(output_dir, "final_video_only.mp4"))
    if not silent_video_path:
        raise RuntimeError("Digital-human video generation did not produce a final video.")
    narration_audio_path = concat_audios(audio_segments, os.path.join(output_dir, "final_narration.mp3"))
    if not narration_audio_path:
        raise RuntimeError("Digital-human narration audio was not produced.")
    with_audio_path = replace_video_audio(
        silent_video_path,
        narration_audio_path,
        os.path.join(output_dir, "final.mp4"),
    )
    final_video_path = with_audio_path
    append_artifact(task_id, artifact(narration_audio_path, "audio", "final_narration"))
    append_artifact(task_id, artifact(final_video_path, "video", "final"))
    logger.info("Digital human pipeline completed: task_id=%s final_video=%s", task_id, final_video_path)

    request_path = write_json(os.path.join(output_dir, "request.json"), {
        "mode": mode,
        "goods_title": goods_title,
        "goods_text": goods_text,
        "character_image": character_image,
        "goods_image": goods_image,
        "generated_image": generated_image,
        "video_model": video_model,
        "audio_duration": audio_duration,
        "narration_sentences": narration_sentences,
        "sentence_audio_paths": sentence_audio_paths,
        "audio_segments": audio_segments,
        "audio_segment_texts": audio_segment_texts,
        "final_narration_audio": narration_audio_path,
        "segment_videos": segment_videos,
        "silent_video_path": silent_video_path,
        "with_audio_path": with_audio_path,
    })

    artifacts = [
        artifact(request_path, "text", "request"),
        artifact(script_path, "text", "script"),
        artifact(character_image, "image", "character"),
        artifact(narration_audio_path, "audio", "final_narration"),
        artifact(final_video_path, "video", "final"),
    ]
    artifacts.extend(audio_artifacts)
    if goods_image:
        artifacts.append(artifact(goods_image, "image", "goods"))
    if generated_image:
        artifacts.append(artifact(generated_image, "image", "generated_reference"))
    for item in artifacts:
        append_artifact(task_id, item)

    output = {
        "script": goods_text,
        "script_path": script_path,
        "audio_path": audio_segments[0] if audio_segments else None,
        "audio_paths": audio_segments,
        "final_audio_path": narration_audio_path,
        "audio_segment_texts": audio_segment_texts,
        "video_path": final_video_path,
        "video_parts": segment_videos,
        "generated_image": generated_image,
    }
    return output, artifacts


def _parse_translations(text: str, languages: list[str]) -> dict[str, str]:
    """从 LLM 响应解析多语言翻译 JSON"""
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.S)
    if not match:
        match = re.search(r"(\{.*\})", text, re.S)
    if not match:
        raise ValueError("Model response did not contain a JSON object.")
    import json
    data = json.loads(match.group(1))
    translations = data.get("translations") if isinstance(data, dict) else None
    if not isinstance(translations, dict):
        raise ValueError("Model response missing translations object.")
    result = {}
    for lang in languages:
        value = translations.get(lang)
        if isinstance(value, str) and value.strip():
            result[lang] = value.strip()
    if not result:
        raise ValueError("No valid translations returned.")
    return result


async def _run_multilingual(
    task_id: str,
    params: dict,
    output_dir: str,
    character_image: str,
    goods_image: Optional[str],
    goods_title: str,
    goods_text: str,
    languages: list[str],
) -> tuple[dict, list[dict]]:
    """数字人多语言：一条文案 → 翻译 → 逐语言 TTS + 视频合成 → zip 打包"""
    logger.info("Digital-human multilingual started: task_id=%s languages=%s", task_id, languages)

    llm = LLM()
    llm_model = required_param(params, "llm_model")
    video_model = required_param(params, "video_model")

    # ---- 1. 一次性翻译全部语言 ----
    update_task(task_id, progress=15, message="Translating script")
    lang_desc = "、".join(f"{lang}（{LANGUAGE_NAMES.get(lang, lang)}）" for lang in languages)
    translate_prompt = (
        f"把下面的口播文案翻译成{lang_desc}。保持口播语气自然地道，适合短视频配音。\n"
        f"原文：{goods_text}\n"
        f'严格按 JSON 输出，不要输出任何其他内容：{{"translations": {{"zh": "中文译文", "en": "English text", ...}}}}'
    )
    response = await run_blocking(llm.query, translate_prompt, model=llm_model)
    translations = _parse_translations(response, languages)
    # 原文语言不在列表时以译文第一条兜底
    if "zh" in languages and "zh" not in translations:
        translations["zh"] = goods_text
    if not translations:
        raise RuntimeError("Translation produced no usable text")
    logger.info("Translations ready: task_id=%s langs=%s", task_id, list(translations.keys()))

    # ---- 2. 视频时长契约 ----
    provider, resolved_video_model = parse_api_workflow(video_model, "video")
    duration_contract = video_capabilities(provider, resolved_video_model).get("duration") or {}
    max_duration = int(duration_contract.get("max") or 10)
    min_duration = int(duration_contract.get("min") or 2)

    # ---- 3. 逐语言合成 ----
    all_artifacts: list[dict] = []
    final_videos: list[tuple[str, str]] = []
    total = len(translations)
    for idx, (lang, text) in enumerate(translations.items(), 1):
        lang_label = LANGUAGE_NAMES.get(lang, lang)
        base_progress = 20 + int(70 * (idx - 1) / max(total, 1))
        update_task(task_id, progress=base_progress, message=f"[{lang_label}] Generating narration audio")

        audio_path = os.path.join(output_dir, f"narration_{lang}.mp3")
        await generate_edge_tts(
            text,
            output_path=audio_path,
            voice=LANGUAGE_VOICES.get(lang, params.get("tts_voice", "zh-CN-YunjianNeural")),
            speed=float(params.get("tts_speed", 1.0)),
        )
        audio_duration = media_duration_seconds(audio_path) or max_duration
        if audio_duration > max_duration:
            sped_path = os.path.join(output_dir, f"narration_{lang}_speed.mp3")
            audio_path = await run_blocking(speed_audio_to_duration, audio_path, sped_path, max_duration)
            audio_duration = media_duration_seconds(audio_path) or max_duration
        safe_duration = max(min_duration, min(max_duration, int(round(audio_duration))))
        audio_artifact = artifact(audio_path, "audio", f"narration_{lang}")
        all_artifacts.append(audio_artifact)
        append_artifact(task_id, audio_artifact)

        update_task(
            task_id,
            progress=base_progress + int(30 / max(total, 1)),
            message=f"[{lang_label}] Calling video API",
        )
        video_path = os.path.join(output_dir, f"video_{lang}.mp4")
        await run_blocking(
            generate_video_api,
            prompt=f"参考图中的人物面对镜头自然口播，保持人物外貌稳定。口播文案：{text}",
            model=video_model,
            output_path=video_path,
            image_path=character_image,
            duration=safe_duration,
            video_ratio=params.get("video_ratio") or "9:16",
            reference_image_paths=[character_image] + ([goods_image] if goods_image else []),
            negative_prompt=params.get("negative_prompt"),
            video_resolution=params.get("video_resolution") or params.get("resolution"),
            watermark=params.get("watermark"),
            prompt_extend=params.get("prompt_extend"),
        )
        final_path = os.path.join(output_dir, f"final_{lang}.mp4")
        replace_video_audio(video_path, audio_path, final_path)
        final_videos.append((lang, final_path))
        video_artifact = artifact(final_path, "video", f"final_{lang}")
        all_artifacts.append(video_artifact)
        append_artifact(task_id, video_artifact)
        logger.info("Multilingual segment done: task_id=%s lang=%s duration=%ss", task_id, lang, safe_duration)

    # ---- 4. 打包 zip ----
    zip_path = os.path.join(output_dir, "multilingual_pack.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for lang, path in final_videos:
            zf.write(path, f"{lang}_{LANGUAGE_NAMES.get(lang, lang)}.mp4")
        script_text = "\n\n".join(
            f"【{LANGUAGE_NAMES.get(lang, lang)}】\n{text}" for lang, text in translations.items()
        )
        zf.writestr("scripts.txt", script_text)
    zip_artifact = artifact(zip_path, "archive", "multilingual_pack")
    all_artifacts.append(zip_artifact)
    append_artifact(task_id, zip_artifact)

    request_path = write_json(os.path.join(output_dir, "request.json"), {
        "mode": "multilingual",
        "languages": languages,
        "translations": translations,
        "character_image": character_image,
        "goods_image": goods_image,
        "video_model": video_model,
        "final_videos": [path for _, path in final_videos],
    })
    request_artifact = artifact(request_path, "text", "request")
    all_artifacts.append(request_artifact)
    append_artifact(task_id, request_artifact)

    script_path = write_text(
        os.path.join(output_dir, "script.txt"),
        "\n\n".join(f"【{LANGUAGE_NAMES.get(lang, lang)}】\n{text}" for lang, text in translations.items()),
    )
    script_artifact = artifact(script_path, "text", "script")
    all_artifacts.append(script_artifact)
    append_artifact(task_id, script_artifact)

    output = {
        "mode": "multilingual",
        "languages": list(translations.keys()),
        "translations": translations,
        "script_path": script_path,
        "videos": [path for _, path in final_videos],
        "video_path": final_videos[0][1] if final_videos else None,
        "zip_path": zip_path,
    }
    logger.info("Digital-human multilingual completed: task_id=%s videos=%d", task_id, len(final_videos))
    return output, all_artifacts
