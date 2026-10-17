"""表情包工厂管线：角色资产 → 九宫格表情包 + zip 打包。

基于图生图（subject_reference）批量生成表情图，最后打 zip 供下载。
"""

import logging
import os
import zipfile
import json

from .api_media import generate_image_api
from .storage import append_artifact, task_output_dir, update_task
from .utils import artifact, copy_input_file, run_blocking, write_json

logger = logging.getLogger(__name__)


def required_param(params: dict, key: str) -> str:
    value = params.get(key)
    if not value:
        raise ValueError(f"meme_factory pipeline requires {key}")
    return str(value)


# 九宫格表情预设（情绪 → 画面描述）
MEME_PRESETS = [
    ("开心", "大笑表情，眼睛弯成月牙，嘴角上扬，头顶飘着小星星"),
    ("无语", "面无表情，一只眼睛半睁，嘴角下垂，头顶三道黑线"),
    ("生气", "鼓起腮帮，眉头紧皱，头顶冒火，脸涨得微红"),
    ("大哭", "眼泪像瀑布一样涌出，嘴巴张得很大，悲伤至极"),
    ("爱心眼", "双眼变成爱心，脸颊绯红，双手托腮，陶醉表情"),
    ("疑问", "头顶一个大问号，歪着头，眉毛一高一低，满脸困惑"),
    ("OK", "一只眼睛眨眼，嘴角自信上扬，比出 OK 手势"),
    ("困倦", "眼皮半睁，嘴角挂着鼻涕泡，头顶 ZZ 符号，昏昏欲睡"),
    ("震惊", "瞳孔地震，嘴巴张成 O 型，双手捂脸，不敢置信"),
]


async def run(task_id: str, params: dict) -> tuple[dict, list[dict]]:
    output_dir = task_output_dir(task_id)
    os.makedirs(output_dir, exist_ok=True)

    image_path = params.get("image_path") or params.get("image_asset")
    if not image_path:
        raise ValueError("meme_factory requires image_path")
    image_path = copy_input_file(image_path, output_dir, "character")

    image_model = required_param(params, "image_model")
    meme_count = int(params.get("meme_count") or 9)
    meme_count = max(1, min(9, meme_count))
    style_hint = (params.get("style_hint") or "").strip()
    video_ratio = params.get("video_ratio") or "1:1"

    presets = MEME_PRESETS[:meme_count]
    if meme_count > len(MEME_PRESETS):
        presets = (MEME_PRESETS * ((meme_count // len(MEME_PRESETS)) + 1))[:meme_count]

    generated = []
    for idx, (emotion, desc) in enumerate(presets, 1):
        update_task(
            task_id,
            progress=10 + int(70 * idx / len(presets)),
            message=f"Drawing meme {idx}/{len(presets)}: {emotion}",
        )
        prompt = (
            f"以输入图片中的角色为主体，创作一个微信表情包：{desc}。"
            f"保持角色的发型、服装、配色等特征一致，Q 版卡通风格，线条简洁，纯白背景，居中构图。"
            f"{style_hint}"
        )
        meme_path = await run_blocking(
            generate_image_api,
            prompt=prompt,
            model=image_model,
            output_dir=output_dir,
            task_id=task_id,
            image_paths=[image_path],
            video_ratio=video_ratio,
            resolution=params.get("image_resolution") or "1080P",
        )
        generated.append({"emotion": emotion, "path": meme_path})
        meme_artifact = artifact(meme_path, "image", f"meme_{idx:02d}_{emotion}")
        append_artifact(task_id, meme_artifact)

    # 打包 zip（文件名用 ASCII 序号，避免部分解压工具中文乱码；情绪映射写入 scripts.json）
    zip_path = os.path.join(output_dir, "meme_pack.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for idx, item in enumerate(generated, 1):
            zf.write(item["path"], f"meme_{idx:02d}.png")
        zf.writestr(
            "scripts.json",
            json.dumps(
                [{"file": f"meme_{idx:02d}.png", "emotion": item["emotion"]} for idx, item in enumerate(generated, 1)],
                ensure_ascii=False,
                indent=2,
            ),
        )

    request_path = write_json(os.path.join(output_dir, "request.json"), {
        "character_image": image_path,
        "image_model": image_model,
        "meme_count": meme_count,
        "style_hint": style_hint,
        "generated": generated,
    })
    artifacts = [
        artifact(request_path, "text", "request"),
        artifact(image_path, "image", "character"),
        artifact(zip_path, "archive", "meme_pack"),
    ]
    artifacts.extend(artifact(item["path"], "image", f"meme_{idx:02d}") for idx, item in enumerate(generated, 1))
    for item in artifacts:
        append_artifact(task_id, item)
    logger.info("meme_factory completed: task_id=%s count=%d zip=%s", task_id, len(generated), zip_path)
    return {
        "meme_count": len(generated),
        "images": [item["path"] for item in generated],
        "zip_path": zip_path,
        "request_path": request_path,
    }, artifacts
