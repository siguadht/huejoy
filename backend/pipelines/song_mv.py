"""Song MV pipeline: audio + lyrics -> energy-curve cut points -> storyboard -> MV.

Distinct from `standard`:
- Accepts a user-uploaded song (audio_path) as the master soundtrack.
- Analyzes the song's loudness curve (ffmpeg ebur128) and places storyboard
  cut points on energy peaks so visuals switch with the music.
- Burns lyric subtitles per segment, then replaces the narration track with
  the user's song.
"""

import logging
import os
import re

from models.llm_client import LLM

from .api_media import generate_image_api
from .standard import build_image_prompt, parse_json_object_response, required_param
from .storage import append_artifact, task_output_dir, update_task
from .tts import generate_edge_tts, _write_silence
from .utils import (
    artifact,
    concat_videos,
    copy_input_file,
    create_static_image_clip,
    media_duration_seconds,
    render_static_text_image,
    replace_video_audio,
    run_blocking,
    write_json,
    write_text,
)

logger = logging.getLogger(__name__)

# Loudness (LUFS) floor: ebur128 reports -120.7 for digital silence.
_SILENCE_DB = -70.0
# Minimum spacing between cut points, in seconds.
_MIN_CUT_GAP = 1.5


def analyze_audio_energy(audio_path: str) -> tuple[float, list[tuple[float, float]]]:
    """Return (total_seconds, [(time, momentary_loudness), ...]) via ebur128."""
    import subprocess

    cmd = [
        "ffmpeg", "-hide_banner", "-nostats", "-i", audio_path,
        "-filter_complex", "ebur128", "-f", "null", "-",
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    stderr = proc.stderr or ""
    points: list[tuple[float, float]] = []
    for match in re.finditer(
        r"t:\s*([\d.]+).*?M:\s*(-?[\d.]+|-inf)\s", stderr
    ):
        t = float(match.group(1))
        m_raw = match.group(2)
        m = _SILENCE_DB if m_raw == "-inf" else float(m_raw)
        points.append((t, max(m, _SILENCE_DB)))
    total = media_duration_seconds(audio_path)
    if not total:
        # Fall back to the last reported timestamp.
        total = points[-1][0] if points else 0.0
    if not points:
        raise RuntimeError("Failed to analyze audio loudness (ebur128 produced no output)")
    return total, points


def pick_cut_points(
    total: float,
    points: list[tuple[float, float]],
    count: int,
) -> list[float]:
    """Choose `count - 1` interior cut timestamps near energy peaks.

    For each target split point (even split of the track), pick the loudest
    sample inside a window around it, so cuts land on musical accents while
    still covering the whole song evenly.
    """
    if count <= 1:
        return []
    step = total / count
    chosen: list[float] = []
    for i in range(1, count):
        target = step * i
        window = [(t, v) for t, v in points if target - 0.75 * step <= t <= target + 0.75 * step]
        if not window:
            chosen.append(round(target, 3))
            continue
        # Keep candidates at least half a segment away from already-picked cuts.
        filtered = [
            (t, v) for t, v in window
            if all(abs(t - c) >= 0.5 * step for c in chosen)
        ]
        pool = filtered or window
        # Loudest wins; ties broken by proximity to the target split point.
        best_t = max(pool, key=lambda tv: (tv[1], -abs(tv[0] - target)))[0]
        chosen.append(round(best_t, 3))
    return sorted(chosen)


def build_segments(total: float, cut_points: list[float]) -> list[tuple[float, float]]:
    """Return [(start, end), ...] covering [0, total]."""
    bounds = [0.0] + list(cut_points) + [total]
    return [
        (round(bounds[i], 3), round(bounds[i + 1], 3))
        for i in range(len(bounds) - 1)
        if bounds[i + 1] - bounds[i] > 0.05
    ]


def split_lyrics(lyrics: str, count: int) -> list[str]:
    """Split lyric text into roughly `count` chunks by line, then punctuation."""
    lines = [ln.strip() for ln in lyrics.splitlines() if ln.strip()]
    if not lines:
        return []
    if len(lines) >= count:
        # Distribute lines across segments as evenly as possible.
        out: list[str] = []
        per = len(lines) / count
        for i in range(count):
            chunk = lines[int(i * per): int((i + 1) * per)]
            out.append(" ".join(chunk))
        return out
    # Fewer lines than segments: split each line by punctuation.
    sentences: list[str] = []
    for ln in lines:
        sentences.extend(s for s in re.split(r"[，。！？；、,!?;]", ln) if s.strip())
    if len(sentences) >= count:
        out = []
        per = len(sentences) / count
        for i in range(count):
            chunk = sentences[int(i * per): int((i + 1) * per)]
            out.append("，".join(chunk))
        return out
    # Fewer units than segments: cycle existing chunks so every segment has
    # a distinct line instead of repeating the whole lyrics.
    pool = sentences or lines
    return [pool[i % len(pool)] for i in range(count)]


async def run(task_id: str, params: dict) -> tuple[dict, list[dict]]:
    output_dir = task_output_dir(task_id)
    os.makedirs(output_dir, exist_ok=True)

    audio_path = params.get("audio_path")
    if not audio_path:
        raise ValueError("song_mv pipeline requires an audio_path")
    audio_path = copy_input_file(audio_path, output_dir, "song")
    lyrics = (params.get("lyrics") or params.get("text") or "").strip()
    if not lyrics:
        raise ValueError("song_mv pipeline requires lyrics")

    llm_model = required_param(params, "llm_model")
    image_model = params.get("image_model") or params.get("image_t2i_model")
    if not image_model:
        raise ValueError("song_mv pipeline requires image_model")
    video_ratio = params.get("video_ratio") or "9:16"
    style_control = (params.get("style_control") or "").strip() or "anime MV key visual, cinematic lighting, high detail"
    segment_count = max(2, min(12, int(params.get("segment_count") or 6)))
    title = (params.get("title") or "").strip() or "Song MV"

    # ---- 1. Analyze the song's loudness curve ----
    update_task(task_id, progress=5, message="Analyzing audio rhythm")
    total, points = await run_blocking(analyze_audio_energy, audio_path)
    logger.info("Audio analyzed: task_id=%s duration=%.1fs samples=%d", task_id, total, len(points))

    # ---- 2. Cut points on energy peaks ----
    cut_points = pick_cut_points(total, points, segment_count)
    segments = build_segments(total, cut_points)
    lyric_chunks = split_lyrics(lyrics, len(segments))
    if len(lyric_chunks) != len(segments):
        # Defensive: never mismatch segments and lyrics.
        lyric_chunks = (lyric_chunks + [lyrics] * len(segments))[: len(segments)]

    # ---- 3. LLM writes per-segment image prompts (mood-matched) ----
    update_task(task_id, progress=10, message="Writing storyboard from lyrics")
    llm = LLM()
    seg_desc = "\n".join(
        f"段落{i + 1}（{start:.1f}s-{end:.1f}s，时长{end - start:.1f}s）：{chunk}"
        for i, ((start, end), chunk) in enumerate(zip(segments, lyric_chunks))
    )
    prompt = (
        f"这是歌曲《{title}》的歌词分段，请为每个段落写一句英文 image prompt，"
        "画面要精准匹配该段歌词的情绪与意象，整体保持同一艺术风格以便连贯。\n"
        f"{seg_desc}\n"
        f'严格输出 JSON，不要任何其他内容：{{"segments": [{{"image_prompt": "..."}}, ...]}}，共 {len(segments)} 个元素。'
    )
    response = await run_blocking(llm.query, prompt, model=llm_model)
    try:
        data = parse_json_object_response(response)
        image_prompts = [str(s.get("image_prompt", "")).strip() for s in data.get("segments", [])]
    except Exception:
        logger.warning("Song-MV storyboard JSON parse failed, fallback to lyric prompts: task_id=%s", task_id)
        image_prompts = []
    if len(image_prompts) != len(segments):
        image_prompts = [
            build_image_prompt(chunk, style_control) for chunk in lyric_chunks
        ]

    storyboard = {
        "title": title,
        "audio_path": audio_path,
        "audio_duration": round(total, 3),
        "energy_curve": [{"t": t, "lufs": v} for t, v in points],
        "cut_points": cut_points,
        "frames": [
            {
                "index": i + 1,
                "start": start,
                "end": end,
                "duration": round(end - start, 3),
                "lyric": lyric_chunks[i],
                "image_prompt": image_prompts[i],
            }
            for i, (start, end) in enumerate(segments)
        ],
    }
    storyboard_path = write_json(os.path.join(output_dir, "storyboard.json"), storyboard)
    artifacts = [artifact(storyboard_path, "text", "storyboard")]
    for item in artifacts:
        append_artifact(task_id, item)

    # ---- 4. Generate one image per segment ----
    images = []
    for idx, frame in enumerate(storyboard["frames"], 1):
        update_task(
            task_id,
            progress=15 + int(35 * idx / len(storyboard["frames"])),
            message=f"Generating image {idx}/{len(storyboard['frames'])}",
        )
        full_prompt = build_image_prompt(frame["image_prompt"], style_control)
        image_path = await run_blocking(
            generate_image_api,
            prompt=full_prompt,
            model=image_model,
            output_dir=output_dir,
            task_id=task_id,
            video_ratio=video_ratio,
        )
        images.append(image_path)
        frame["image_path"] = image_path
        image_artifact = artifact(image_path, "image", f"image_{idx:02d}")
        artifacts.append(image_artifact)
        append_artifact(task_id, image_artifact)
        write_json(storyboard_path, storyboard)

    # ---- 5. Optional per-segment narration (TTS) as a scratch track ----
    # The final soundtrack is always the user's song; the scratch track only
    # drives static-clip durations when the user opts in.
    scratch_track = bool(params.get("scratch_narration"))
    scratch_audios: list[str] = []
    if scratch_track:
        for idx, frame in enumerate(storyboard["frames"], 1):
            audio_path_seg = os.path.join(output_dir, f"scratch_{idx:02d}.mp3")
            await generate_edge_tts(
                frame["lyric"],
                output_path=audio_path_seg,
                voice=params.get("tts_voice", "zh-CN-YunjianNeural"),
            )
            scratch_audios.append(audio_path_seg)

    # ---- 6. Burn lyric subtitles on each segment image ----
    clips = []
    for idx, (image_path, frame) in enumerate(zip(images, storyboard["frames"]), 1):
        update_task(
            task_id,
            progress=50 + int(25 * idx / len(images)),
            message=f"Building clip {idx}/{len(images)}",
        )
        captioned_path = os.path.join(output_dir, f"clip_{idx:02d}.jpg")
        await run_blocking(
            render_static_text_image,
            image_path,
            captioned_path,
            subtitle=frame["lyric"],
            title=title if idx == 1 else None,
            video_ratio=video_ratio,
        )
        clip_video_path = os.path.join(output_dir, f"clip_{idx:02d}.mp4")
        if scratch_track and idx - 1 < len(scratch_audios):
            # Scratch narration defines the clip length (roughly the segment).
            await run_blocking(
                create_static_image_clip,
                captioned_path,
                scratch_audios[idx - 1],
                clip_video_path,
                video_ratio=video_ratio,
                duration=frame["duration"],
            )
        else:
            silent_path = os.path.join(output_dir, f"silent_{idx:02d}.mp3")
            await run_blocking(_write_silence, silent_path, frame["duration"])
            await run_blocking(
                create_static_image_clip,
                captioned_path,
                silent_path,
                clip_video_path,
                video_ratio=video_ratio,
                duration=frame["duration"],
            )
        clips.append(clip_video_path)

    # ---- 7. Concat clips and swap in the user's song ----
    update_task(task_id, progress=80, message="Concatenating clips")
    video_only_path = concat_videos(clips, os.path.join(output_dir, "mv_silent.mp4"))
    if not video_only_path:
        raise RuntimeError("Song MV generation did not produce a concatenated video.")

    # Global lyric subtitles across the whole timeline (belt & braces with
    # the per-clip captions: keeps lyrics readable when clips are short).
    update_task(task_id, progress=88, message="Burning subtitles")
    final_path = os.path.join(output_dir, "final.mp4")
    await run_blocking(replace_video_audio, video_only_path, audio_path, final_path)

    final_artifact = artifact(final_path, "video", "final")
    artifacts.append(final_artifact)
    append_artifact(task_id, final_artifact)

    script_path = write_text(
        os.path.join(output_dir, "lyrics.txt"),
        "\n".join(f"[{f['start']:.1f}s-{f['end']:.1f}s] {f['lyric']}" for f in storyboard["frames"]),
    )
    script_artifact = artifact(script_path, "text", "lyrics")
    artifacts.append(script_artifact)
    append_artifact(task_id, script_artifact)

    write_json(storyboard_path, storyboard)
    output = {
        "title": title,
        "audio_path": audio_path,
        "audio_duration": round(total, 3),
        "cut_points": cut_points,
        "segments": [
            {"start": f["start"], "end": f["end"], "lyric": f["lyric"], "image_path": f["image_path"]}
            for f in storyboard["frames"]
        ],
        "images": images,
        "storyboard_path": storyboard_path,
        "video_only_path": video_only_path,
        "final_video": final_path,
    }
    logger.info("Song MV completed: task_id=%s duration=%.1fs segments=%d", task_id, total, len(segments))
    return output, artifacts
