"""
MiniMax image-01 出图 API 客户端（海螺）

自有协议（非 OpenAI 兼容），同步流程：一次 POST 直接返回图片（url 或 base64）。
端点：https://api.minimaxi.com/v1/image_generation（国内站）

支持的生成模式：
  - 文生图 t2i : 仅 prompt
  - 图生图 i2i : subject_reference = [{type: character, image_file: URL|base64}]
    （API 仅支持单张人物主体参考；本地图片自动转 base64 Data URL，免图床，上限 10MB）

与视频共用同一把订阅 Key（M Plan Explore 含图像模型）。
"""

import os
import sys

models_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(models_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import base64
import logging
import mimetypes
from typing import Optional
from uuid import uuid4

import requests

from config import Config

logger = logging.getLogger(__name__)

MINIMAX_BASE_URL = "https://api.minimaxi.com"
MINIMAX_IMAGE_MODELS = {"image-01", "image-01-live"}
MINIMAX_RATIOS = {"1:1", "16:9", "4:3", "3:2", "2:3", "3:4", "9:16", "21:9"}
MAX_REF_BYTES = 10 * 1024 * 1024  # 参考图上限 10MB


class MinimaxImageClient:
    """
    MiniMax image-01 出图客户端（同步，提交即返回）
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: int = 120,
    ) -> None:
        self.api_key = api_key or Config.MINIMAX_API_KEY
        self.base_url = (base_url or Config.MINIMAX_BASE_URL or MINIMAX_BASE_URL).rstrip("/")
        self.timeout = timeout

        if not self.api_key:
            logger.warning("MinimaxImageClient: MINIMAX_API_KEY 未设置")

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    # ---------- 归一化 ----------

    @staticmethod
    def _normalize_model(model: Optional[str]) -> str:
        """接受 image-01 / MiniMax-image-01 / image-01-live 等写法，归一为 API 模型名。"""
        value = (model or "").strip().lower()
        for candidate in MINIMAX_IMAGE_MODELS:
            if candidate in value:
                return candidate
        return "image-01"

    @staticmethod
    def _normalize_ratio(aspect_ratio: Optional[str]) -> str:
        value = (aspect_ratio or "").strip()
        return value if value in MINIMAX_RATIOS else "16:9"

    @staticmethod
    def _to_image_file(path_or_url: str) -> str:
        """http(s)/data: 原样返回；本地文件转 base64 Data URL（MiniMax 原生支持，免图床）。"""
        value = (path_or_url or "").strip()
        if value.startswith(("http://", "https://", "data:")):
            return value
        if not os.path.exists(value):
            raise FileNotFoundError(f"参考图不存在: {value}")
        size = os.path.getsize(value)
        if size > MAX_REF_BYTES:
            raise ValueError(f"参考图超过 10MB 上限: {value} ({size / 1024 / 1024:.1f}MB)")
        mime = mimetypes.guess_type(value)[0] or "image/jpeg"
        with open(value, "rb") as f:
            encoded = base64.b64encode(f.read()).decode("ascii")
        return f"data:{mime};base64,{encoded}"

    # ---------- 主流程 ----------

    def generate_image(
        self,
        prompt: str,
        model: str = "image-01",
        image_paths: Optional[list] = None,
        aspect_ratio: str = "16:9",
        response_format: str = "url",
        prompt_optimizer: bool = False,
        watermark: Optional[bool] = None,
        save_dir: Optional[str] = None,
        session_id: Optional[str] = None,
        n: int = 1,
    ) -> list:
        """
        生成图片完整流程（同步）

        Args:
            prompt: 提示词（必填，最长 1500 字符）
            model: image-01 / image-01-live（容忍 MiniMax-image-01 等写法）
            image_paths: 参考图列表（本地路径或公网 URL）；API 仅取第一张
            aspect_ratio: 1:1/16:9/4:3/3:2/2:3/3:4/9:16/21:9
            response_format: url（默认，24h 有效，自动下载）/ base64
            prompt_optimizer: 是否开启 prompt 自动优化
            watermark: 是否添加 AIGC 水印
            save_dir: 输出目录
            session_id: 会话 ID（ save_dir 缺省时用于分子目录）
            n: 生成数量 [1, 9]
        Returns:
            本地图片路径列表
        """
        if not self.api_key:
            raise RuntimeError("MINIMAX_API_KEY not set.")
        if not prompt or not prompt.strip():
            raise ValueError("MiniMax 出图需要非空 prompt")
        prompt = prompt.strip()[:1500]

        payload = {
            "model": self._normalize_model(model),
            "prompt": prompt,
            "aspect_ratio": self._normalize_ratio(aspect_ratio),
            "response_format": response_format if response_format in ("url", "base64") else "url",
            "n": max(1, min(9, int(n or 1))),
            "prompt_optimizer": bool(prompt_optimizer),
            "aigc_watermark": bool(watermark) if watermark is not None else False,
        }

        refs = [p for p in (image_paths or []) if p]
        if refs:
            # API 仅支持单张人物主体参考，多余的忽略
            payload["subject_reference"] = [{
                "type": "character",
                "image_file": self._to_image_file(refs[0]),
            }]
            if len(refs) > 1:
                logger.warning("MiniMax 出图仅支持单张参考图，已忽略其余 %d 张", len(refs) - 1)

        logger.info(
            "MinimaxImageClient: 提交出图 model=%s ratio=%s refs=%d",
            payload["model"], payload["aspect_ratio"], len(refs),
        )

        resp = requests.post(
            f"{self.base_url}/v1/image_generation",
            headers=self._headers(),
            json=payload,
            timeout=self.timeout,
            proxies=Config.requests_proxies("minimax"),
        )
        # 先解析错误体再决定抛什么（MiniMax 错误在 base_resp.status_code / status_msg）
        try:
            data = resp.json()
        except ValueError:
            data = {}
        base_resp = data.get("base_resp") or {}
        if base_resp.get("status_code") not in (0, None):
            raise RuntimeError(
                f"MiniMax 出图错误[{base_resp.get('status_code')}]: {base_resp.get('status_msg')}"
            )
        if not resp.ok:
            logger.error("MiniMax 出图失败: %s", resp.text)
            resp.raise_for_status()

        payload_data = data.get("data") or {}
        images = payload_data.get("image_urls") or payload_data.get("image_base64") or []
        if not images:
            raise RuntimeError(f"MiniMax 出图未返回图片: {data}")

        # 保存到本地
        if not save_dir:
            save_dir = os.path.join(backend_dir, "code", "result", "image_minimax", session_id or "default")
        os.makedirs(save_dir, exist_ok=True)

        saved = []
        for i, img in enumerate(images):
            out_path = os.path.join(save_dir, f"minimax_{uuid4().hex[:8]}_{i}.jpg")
            if response_format == "base64" or str(img).startswith("data:"):
                raw = str(img).split(",", 1)[1] if "," in str(img) else str(img)
                with open(out_path, "wb") as f:
                    f.write(base64.b64decode(raw))
            else:
                dl = requests.get(img, timeout=180, proxies=Config.requests_proxies("minimax"))
                dl.raise_for_status()
                with open(out_path, "wb") as f:
                    f.write(dl.content)
            saved.append(out_path)

        logger.info("MinimaxImageClient: 已保存 %d 张图 -> %s", len(saved), save_dir)
        return saved


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    OUTPUT_DIR = "code/result/image_minimax/test"
    PROMPT = "一只橘猫在雨夜便利店门口张望，电影感，浅景深，暖色灯光"

    print("=== MiniMax image-01 文生图自测 ===")
    client = MinimaxImageClient()
    if not client.api_key:
        print("✗ MINIMAX_API_KEY 未设置，请检查 config.yaml 配置")
        sys.exit(1)
    print(f"  API Key : {client.api_key[:8]}***{client.api_key[-4:]}")
    print(f"  Base URL: {client.base_url}")
    try:
        paths = client.generate_image(
            prompt=PROMPT,
            model="image-01",
            aspect_ratio="16:9",
            save_dir=OUTPUT_DIR,
        )
        print(f"✓ 出图完成！共 {len(paths)} 张")
        for p in paths:
            print(f"  {os.path.abspath(p)} ({os.path.getsize(p) / 1024:.0f} KB)")
    except Exception as e:
        print(f"✗ 失败: {e}")
        sys.exit(1)
