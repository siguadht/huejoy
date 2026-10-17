from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class StandardPipelineRequest(BaseModel):
    text: str = Field(..., description="Topic or fixed narration script")
    mode: str = "copy"
    title: Optional[str] = None
    segment_count: Optional[int] = Field(None, ge=1, le=20, description="Target narration segment count for inspiration mode")
    n_scenes: int = 5
    split_mode: str = "paragraph"
    llm_model: Optional[str] = None
    image_model: Optional[str] = None
    video_model: Optional[str] = None
    video_mode: str = Field("image_concat", description="image_concat or dynamic_video")
    video_ratio: str = "9:16"
    image_resolution: str = "1080P"
    video_resolution: Optional[str] = None
    style_control: Optional[str] = None
    generate_audio: bool = True
    generate_videos: bool = False
    enable_subtitles: bool = False
    subtitle_render_mode: Literal["postprocess", "image_model"] = "postprocess"
    subtitle_template: Optional[str] = None
    subtitle_template_fields: Optional[Dict[str, str]] = None
    template_media_kind: Literal["image", "video"] = "image"
    video_duration: int = 5
    tts_voice: str = "zh-CN-YunjianNeural"
    tts_speed: float = 1.0
    negative_prompt: Optional[str] = None
    watermark: Optional[bool] = None
    generate_audio_native: Optional[bool] = None


class ActionTransferPipelineRequest(BaseModel):
    prompt_text: str
    image_path: str
    video_path: str
    video_model: Optional[str] = None
    duration: int = 5
    video_ratio: str = "9:16"
    video_resolution: Optional[str] = None
    resolution: Optional[str] = None
    negative_prompt: Optional[str] = None
    watermark: Optional[bool] = None
    prompt_extend: Optional[bool] = None


class DigitalHumanPipelineRequest(BaseModel):
    mode: str = "customize"
    character_image_path: str
    goods_image_path: Optional[str] = None
    goods_title: Optional[str] = None
    goods_text: Optional[str] = None
    llm_model: Optional[str] = None
    image_model: Optional[str] = None
    image_resolution: str = "1080P"
    video_model: Optional[str] = None
    duration: int = 5
    video_ratio: str = "9:16"
    video_resolution: Optional[str] = None
    resolution: Optional[str] = None
    tts_voice: str = "zh-CN-YunjianNeural"
    tts_speed: float = 1.0
    negative_prompt: Optional[str] = None
    watermark: Optional[bool] = None
    prompt_extend: Optional[bool] = None
    languages: Optional[List[str]] = Field(None, description="多语言模式：>=2 个语言代码时走翻译+逐语言合成")


class ImageAnimatePipelineRequest(BaseModel):
    image_path: str
    video_model: Optional[str] = None
    prompt_text: Optional[str] = None
    motion: str = "orbit"
    duration: int = 5
    video_ratio: str = "1:1"
    video_resolution: Optional[str] = None
    resolution: Optional[str] = None
    negative_prompt: Optional[str] = None
    watermark: Optional[bool] = None
    prompt_extend: Optional[bool] = None


class MemeFactoryPipelineRequest(BaseModel):
    image_path: str
    image_model: Optional[str] = None
    meme_count: int = Field(9, ge=1, le=9)
    style_hint: Optional[str] = None
    video_ratio: str = "1:1"
    image_resolution: str = "1080P"


class VideoUnderstandPipelineRequest(BaseModel):
    video_path: str
    vlm_model: Optional[str] = None
    llm_model: Optional[str] = None
    image_model: Optional[str] = None
    scene: str = "commentary"
    focus_text: Optional[str] = None
    title: Optional[str] = None
    segment_count: int = Field(6, ge=3, le=12)
    video_ratio: str = "9:16"
    image_resolution: str = "1080P"
    style_control: Optional[str] = None
    tts_voice: str = "zh-CN-YunjianNeural"
    tts_speed: float = 1.0


class SongMvPipelineRequest(BaseModel):
    audio_path: str
    lyrics: str
    title: Optional[str] = None
    llm_model: Optional[str] = None
    image_model: Optional[str] = None
    segment_count: int = Field(6, ge=2, le=12)
    video_ratio: str = "9:16"
    style_control: Optional[str] = None
    scratch_narration: Optional[bool] = None


class AudioBookPipelineRequest(BaseModel):
    text: str
    title: Optional[str] = None
    llm_model: Optional[str] = None
    image_model: Optional[str] = None
    segment_count: int = Field(5, ge=2, le=12)
    video_ratio: str = "9:16"
    style_control: Optional[str] = None
    voice_preset: str = "storybook"
    tts_engine: str = "minimax"
    tts_speed: float = 1.0


class GenericPipelineRequest(BaseModel):
    params: Dict[str, Any]
