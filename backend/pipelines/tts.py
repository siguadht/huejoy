import asyncio
import json
import logging
import os
import re
import shutil
import subprocess
import urllib.request
from typing import Optional

logger = logging.getLogger(__name__)

# MiniMax T2A 音色池（本订阅套餐实测可用 4 个，均为多语言音色，可读中/英/日等文本）
_MINIMAX_VOICE_FEMALE = "audiobook_female_1"   # 女声旁白
_MINIMAX_VOICE_MALE = "audiobook_male_1"       # 男声旁白
_MINIMAX_VOICE_GIRL = "female-shaonv"          # 少女
_MINIMAX_VOICE_BOY = "male-qn-qingse"          # 青涩男声

# edge-tts 音色名 → MiniMax 音色 ID 的关键词（判断顺序：少女 → 女声 → 男声；
# "female" 内含子串 "male"，女性关键词必须先于男性兜底）
_MM_YOUNG_FEMALE = ("xiaoshuang", "xiaoyi", "xiaomeng", "xiaohan", "nanami", "girl", "child")
_MM_FEMALE = ("xiaoxiao", "female", "yujie", "meijia", "denise", "katja", "tingting")
_MM_BOY = ("yunxi", "yunhao", "boy")


def _to_minimax_voice(voice: str) -> str:
    """把 edge-tts 风格音色名（zh-CN-XiaoxiaoNeural / en-US-GuyNeural…）映射为
    MiniMax T2A 音色 ID；MiniMax 自有 ID（无 'xx-XX-' 区域前缀）原样透传。"""
    v = (voice or "").strip()
    if not v:
        return _MINIMAX_VOICE_FEMALE
    if not re.match(r"^[a-z]{2}-[A-Z]{2}-", v):
        return v  # 已是 MiniMax 音色 ID（如 audiobook_female_1 / female-shaonv）
    low = v.lower()
    if any(k in low for k in _MM_YOUNG_FEMALE):
        return _MINIMAX_VOICE_GIRL
    if any(k in low for k in _MM_BOY):
        return _MINIMAX_VOICE_BOY
    if any(k in low for k in _MM_FEMALE):
        return _MINIMAX_VOICE_FEMALE
    return _MINIMAX_VOICE_MALE


def speed_to_rate(speed: Optional[float]) -> str:
    value = 1.0 if speed is None else float(speed)
    percent = int(round((value - 1.0) * 100))
    sign = "+" if percent >= 0 else ""
    return f"{sign}{percent}%"


def _write_silence(output_path: str, seconds: float = 3.0) -> str:
    """最后兜底：写一段静音，保证管线不中断"""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg:
        subprocess.run(
            [ffmpeg, "-y", "-v", "quiet", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
             "-t", str(seconds), "-q:a", "9", output_path],
            check=False,
        )
        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            return output_path
    # 无 ffmpeg 时写最小合法 mp3 帧（静音）
    frame = bytes.fromhex("fffb900c0000000000000000000000000000000000000000")
    with open(output_path, "wb") as f:
        f.write(frame * 40)
    return output_path


# macOS say 中文音色（edge-tts / MiniMax 均不可用时按角色映射，保住多角色区分度）
# 注意：判断顺序必须「少女 → 女声 → 男声」，因为 "female" 内含子串 "male"
_SAY_YOUNG_FEMALE = ("child", "shaonv", "tianmei", "xiaoshuang", "xiaoyi", "girl", "flo")
_SAY_FEMALE = ("female", "xiaoxiao", "yujie", "xiaomeng", "xiaohan", "tingting", "meijia")
_SAY_MALE = (
    "male", "yunxi", "yunjian", "yunfeng", "yunhao", "yunjie", "yunyang",
    "yunze", "grandpa", "eddy", "reed", "rocko", "boy",
)


def _say_voice_for(voice: str) -> str:
    v = (voice or "").lower()
    if any(k in v for k in _SAY_YOUNG_FEMALE):
        return "Flo"
    if any(k in v for k in _SAY_FEMALE):
        return "Tingting"
    if any(k in v for k in _SAY_MALE):
        return "Eddy"
    return "Tingting"


def _generate_say_tts(text: str, output_path: str, voice: str = "") -> str:
    """macOS 内置 say 兜底：MiniMax / edge-tts 均不可用时顶班，音质一般但可用"""
    say = shutil.which("say")
    if not say:
        raise RuntimeError("say command not available")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    aiff_path = output_path + ".aiff"
    subprocess.run([say, "-v", _say_voice_for(voice), text, "-o", aiff_path], check=True, timeout=60)
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg:
        subprocess.run([ffmpeg, "-y", "-v", "quiet", "-i", aiff_path, "-q:a", "9", output_path], check=True)
        os.remove(aiff_path)
    else:
        os.replace(aiff_path, output_path)
    if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
        raise RuntimeError("say fallback produced empty audio")
    return output_path


def _minimax_tts_config() -> tuple[Optional[str], str]:
    try:
        from config import Config
        key = getattr(Config, "MINIMAX_API_KEY", None)
        base_url = (getattr(Config, "MINIMAX_BASE_URL", None) or "https://api.minimaxi.com").rstrip("/")
        return key, base_url
    except Exception:
        return None, "https://api.minimaxi.com"


def _generate_minimax_tts(text: str, output_path: str, voice: str, speed: float = 1.0) -> str:
    """MiniMax T2A v2 语音合成（订阅 Key 内含，真实多音色，国内直连可用）"""
    key, base_url = _minimax_tts_config()
    if not key:
        raise RuntimeError("MINIMAX_API_KEY not configured")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    body = json.dumps({
        "model": "speech-02-hd",
        "text": text,
        "stream": False,
        "voice_setting": {
            "voice_id": _to_minimax_voice(voice),
            "speed": float(speed),
            "vol": 1.0,
            "pitch": 0,
        },
        "audio_setting": {"sample_rate": 32000, "bitrate": 128000, "format": "mp3", "channel": 1},
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{base_url}/v1/t2a_v2",
        data=body,
        method="POST",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    base_resp = data.get("base_resp") or {}
    if base_resp.get("status_code") != 0:
        raise RuntimeError(f"MiniMax T2A error {base_resp.get('status_code')}: {base_resp.get('status_msg')}")
    audio_hex = (data.get("data") or {}).get("audio") or ""
    if not audio_hex:
        raise RuntimeError("MiniMax T2A returned empty audio")
    # MiniMax T2A v2 的 data.audio 是 hex 字符串（非 base64）
    raw = bytes.fromhex(audio_hex)
    if not raw:
        raise RuntimeError("MiniMax T2A returned empty audio")
    with open(output_path, "wb") as f:
        f.write(raw)
    return output_path


async def generate_edge_tts(
    text: str,
    output_path: str,
    voice: str = "zh-CN-YunjianNeural",
    speed: float = 1.0,
    provider: str = "auto",
) -> str:
    """TTS 合成，按 provider 策略依次降级：
    - auto/minimax：MiniMax T2A（多音色）→ edge-tts → macOS say（音色映射）→ 静音
    - edge：edge-tts → macOS say → 静音
    - say：macOS say → 静音
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    if provider in ("auto", "minimax"):
        try:
            result = await asyncio.to_thread(_generate_minimax_tts, text, output_path, voice, speed)
            if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                return result
        except Exception as exc:
            logger.warning("MiniMax TTS failed (%s), trying edge-tts", exc)

    if provider in ("auto", "edge"):
        try:
            import edge_tts
        except ImportError as exc:
            raise RuntimeError("edge-tts is required for audio generation. Install backend dependencies again.") from exc
        communicate = edge_tts.Communicate(text=text, voice=voice, rate=speed_to_rate(speed))
        try:
            await communicate.save(output_path)
            if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                return output_path
            raise RuntimeError("edge-tts produced empty audio")
        except Exception as exc:
            logger.warning("edge-tts failed (%s), falling back to system say", exc)

    try:
        return await asyncio.to_thread(_generate_say_tts, text, output_path, voice)
    except Exception as fallback_exc:
        logger.warning("say fallback failed (%s), writing silence", fallback_exc)
        return await asyncio.to_thread(_write_silence, output_path, max(3.0, len(text) * 0.25))
