"""单图动效管线：商品 360° 展示 / 品牌片头动效。

输入一张图 + 运镜描述，直接调用图生视频 API，产出短动效视频。
与 action_transfer 的区别：不需要参考动作视频，纯靠 prompt 描述运镜。
"""

import logging
import os

from .api_media import generate_video_api
from .storage import append_artifact, task_output_dir, update_task
from .utils import artifact, copy_input_file, run_blocking, write_json

logger = logging.getLogger(__name__)


def required_param(params: dict, key: str) -> str:
    value = params.get(key)
    if not value:
        raise ValueError(f"image_animate pipeline requires {key}")
    return str(value)


# 预设备选运镜（前端未填 prompt_text 时按场景取默认）
MOTION_PRESETS = {
    "orbit": "镜头围绕主体平滑环绕旋转一圈，主体保持清晰稳定，商业展示运镜，光影自然",
    "zoom_in": "镜头缓慢推近主体，从全景推至特写，焦点始终清晰，电影感运镜",
    "zoom_out": "镜头从主体特写缓慢拉远至全景，展现完整形态，电影感运镜",
    "pan": "镜头水平匀速横移，掠过主体，展现细节与质感，商业摄影运镜",
    "reveal": "镜头从主体上方缓慢降落并微微前推，揭幕感，光影流动",
}


async def run(task_id: str, params: dict) -> tuple[dict, list[dict]]:
    output_dir = task_output_dir(task_id)
    os.makedirs(output_dir, exist_ok=True)

    image_path = params.get("image_path") or params.get("image_asset")
    if not image_path:
        raise ValueError("image_animate requires image_path")

    motion = (params.get("motion") or "orbit").strip()
    prompt_text = (params.get("prompt_text") or "").strip()
    if not prompt_text:
        prompt_text = MOTION_PRESETS.get(motion, MOTION_PRESETS["orbit"])
    # 品牌片头类可附加 logo 保持指令
    if params.get("keep_subject", True):
        prompt_text = f"{prompt_text}，严格保持输入图片中的主体外形、颜色与文字不变"

    image_path = copy_input_file(image_path, output_dir, "input_image")
    video_model = required_param(params, "video_model")
    duration = int(params.get("duration") or 5)
    video_ratio = params.get("video_ratio") or "1:1"

    update_task(task_id, progress=20, message="Calling image-to-video API")
    final_video_path = os.path.join(output_dir, "final.mp4")
    await run_blocking(
        generate_video_api,
        prompt=prompt_text,
        model=video_model,
        output_path=final_video_path,
        image_path=image_path,
        duration=duration,
        video_ratio=video_ratio,
        video_resolution=params.get("video_resolution") or params.get("resolution"),
        negative_prompt=params.get("negative_prompt"),
        watermark=params.get("watermark"),
        prompt_extend=params.get("prompt_extend"),
    )

    request_path = write_json(os.path.join(output_dir, "request.json"), {
        "prompt": prompt_text,
        "motion": motion,
        "image_path": image_path,
        "video_model": video_model,
        "duration": duration,
        "video_ratio": video_ratio,
    })
    artifacts = [
        artifact(request_path, "text", "request"),
        artifact(image_path, "image", "input_image"),
        artifact(final_video_path, "video", "final"),
    ]
    for item in artifacts:
        append_artifact(task_id, item)
    logger.info("image_animate completed: task_id=%s motion=%s", task_id, motion)
    return {"video_path": final_video_path, "request_path": request_path}, artifacts
