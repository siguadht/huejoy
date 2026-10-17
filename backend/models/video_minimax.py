"""
MiniMax-H3（海螺）视频生成 API 客户端

自有协议（非 OpenAI 兼容），异步流程：提交任务 -> 轮询 -> 下载。
端点：https://api.minimaxi.com（国内站）

支持的生成模式：
  - 文生视频 t2v      : content = [text]
  - 图生视频 i2v      : content = [text, image_url(role=first_frame/last_frame)]
  - 参考生视频 r2v    : content = [text, image_url(reference_image), video_url(reference_video), audio_url(reference_audio)]

注意：接口只接受公网 URL，不支持 base64 / file_id。本地图片经 uguu.se 临时图床转公网 URL。
"""

import os
import sys

models_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(models_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import time
import logging
import requests
from typing import Optional
from config import Config

logger = logging.getLogger(__name__)

MINIMAX_BASE_URL = "https://api.minimaxi.com"
MINIMAX_RATIOS = {"adaptive", "21:9", "16:9", "4:3", "1:1", "3:4", "9:16"}


class MinimaxVideoClient:
    """
    MiniMax-H3 视频生成客户端
    采用 提交任务 -> 轮询 -> 下载 的异步流程
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: int = 60,
    ) -> None:
        self.api_key = api_key or Config.MINIMAX_API_KEY
        self.base_url = (base_url or Config.MINIMAX_BASE_URL or MINIMAX_BASE_URL).rstrip("/")
        self.timeout = timeout

        if not self.api_key:
            logger.warning("MinimaxVideoClient: MINIMAX_API_KEY 未设置")

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    # ---------- 公网 URL 转换 ----------

    def _to_public_url(self, path_or_url: str) -> str:
        """
        把本地路径或 URL 统一转成 MiniMax 可拉取的公网 URL。
        http(s) 原样返回；本地文件上传 uguu.se 临时图床。
        """
        value = (path_or_url or "").strip()
        if value.startswith("http://") or value.startswith("https://"):
            return value
        if not os.path.exists(value):
            raise FileNotFoundError(f"输入文件不存在: {value}")
        return self._upload_to_image_host(value)

    @staticmethod
    def _upload_to_image_host(file_path: str) -> str:
        """上传本地文件到 uguu.se 临时图床，返回公网 URL（约 48h 有效）。"""
        with open(file_path, "rb") as f:
            resp = requests.post(
                "https://uguu.se/upload.php",
                files={"files[]": (os.path.basename(file_path), f)},
                timeout=120,
            )
        resp.raise_for_status()
        data = resp.json()
        if not data.get("success"):
            raise RuntimeError(f"图床上传失败: {data}")
        url = data.get("files", [{}])[0].get("url")
        if not url:
            raise RuntimeError(f"图床未返回 URL: {data}")
        logger.info("MinimaxVideoClient: 本地文件已转公网 URL: %s", url)
        return url

    # ---------- 主流程 ----------

    def generate_video(
        self,
        prompt: str,
        save_path: str,
        model: str = "MiniMax-H3",
        image_path: Optional[str] = None,
        last_image_path: Optional[str] = None,
        reference_image_paths: Optional[list] = None,
        reference_video_paths: Optional[list] = None,
        reference_audio_path: Optional[str] = None,
        duration: int = 5,
        ratio: str = "adaptive",
        resolution: Optional[str] = None,
        watermark: Optional[bool] = None,
        **kwargs,
    ) -> str:
        """
        生成视频完整流程

        Args:
            prompt: 提示词（必填）
            save_path: 输出视频保存路径
            model: MiniMax-H3 / MiniMax-H3-Max
            image_path: 首帧图片（本地路径或公网 URL）
            last_image_path: 尾帧图片（可选）
            reference_image_paths: 参考图列表（r2v）
            reference_video_paths: 参考视频列表（r2v）
            reference_audio_path: 参考音频（r2v）
            duration: 时长秒（H3: 4-15；H3-Max: 5-15）
            ratio: 宽高比；t2v 必须具体值，i2v 恒为 adaptive
            resolution: 768P / 2K（H3）；480P / 768P（H3-Max）
        Returns:
            远端视频 URL
        """
        if not self.api_key:
            raise RuntimeError("MINIMAX_API_KEY not set.")
        if not prompt or not prompt.strip():
            raise ValueError("MiniMax 视频生成需要非空 prompt")

        content = [{"type": "text", "text": prompt.strip()}]

        # 首尾帧（i2v）
        if image_path:
            content.append({
                "type": "image_url",
                "image_url": {"url": self._to_public_url(image_path)},
                "role": "first_frame",
            })
        if last_image_path:
            content.append({
                "type": "image_url",
                "image_url": {"url": self._to_public_url(last_image_path)},
                "role": "last_frame",
            })

        # 参考素材（r2v）
        for ref_img in (reference_image_paths or []):
            content.append({
                "type": "image_url",
                "image_url": {"url": self._to_public_url(ref_img)},
                "role": "reference_image",
            })
        for ref_video in (reference_video_paths or []):
            content.append({
                "type": "video_url",
                "video_url": {"url": self._to_public_url(ref_video)},
                "role": "reference_video",
            })
        if reference_audio_path:
            content.append({
                "type": "audio_url",
                "audio_url": {"url": self._to_public_url(reference_audio_path)},
                "role": "reference_audio",
            })

        has_frame = bool(image_path or last_image_path)
        has_reference = bool(reference_image_paths or reference_video_paths or reference_audio_path)
        if has_frame and has_reference:
            raise ValueError("MiniMax: first/last_frame 与 reference_* 不可混用")

        # 时长钳制
        duration = int(duration)
        is_max = "max" in model.lower()
        duration = max(5 if is_max else 4, min(15, duration))

        # 分辨率归一
        if not resolution:
            resolution = "768P"
        resolution = resolution.strip().upper()
        allowed = {"480P", "768P"} if is_max else {"768P", "2K"}
        if resolution not in allowed:
            resolution = "768P"

        # ratio 规则：i2v 恒 adaptive；t2v 必须具体值
        if has_frame:
            ratio = "adaptive"
        else:
            ratio = (ratio or "16:9").strip()
            if ratio not in MINIMAX_RATIOS or ratio == "adaptive":
                ratio = "16:9"

        payload = {
            "model": model,
            "content": content,
            "resolution": resolution,
            "duration": duration,
            "ratio": ratio,
            "aigc_watermark": bool(watermark) if watermark is not None else False,
        }

        logger.info(
            "MinimaxVideoClient: 提交任务 model=%s duration=%ds resolution=%s ratio=%s",
            model, duration, resolution, ratio,
        )

        task_id = self._submit_task(payload)
        video_url = self._poll_until_done(task_id)
        self._download_video(video_url, save_path)
        return video_url

    def _submit_task(self, payload: dict) -> str:
        url = f"{self.base_url}/v2/video_generation"
        resp = requests.post(
            url,
            headers=self._headers(),
            json=payload,
            timeout=self.timeout,
            proxies=Config.requests_proxies("minimax"),
        )
        # 先解析错误体再决定抛什么（MiniMax 的 402/400 都带 JSON 错误详情，
        # 直接 raise_for_status 会把友好信息变成裸 HTTPError）
        try:
            data = resp.json()
        except ValueError:
            data = {}
        if data.get("type") == "error":
            err = data.get("error", {})
            raise RuntimeError(
                f"MiniMax API 错误[{err.get('type')}]: {err.get('message')}"
            )
        if not resp.ok:
            logger.error("MiniMax 提交失败: %s", resp.text)
            resp.raise_for_status()
        task_id = data.get("task_id")
        if not task_id:
            raise RuntimeError(f"MiniMax API 未返回任务 ID: {data}")
        return task_id

    def _poll_until_done(self, task_id: str, max_polls: int = 180, interval: int = 5) -> str:
        url = f"{self.base_url}/v2/query/video_generation/{task_id}"
        for i in range(max_polls):
            resp = requests.get(
                url,
                headers=self._headers(),
                timeout=30,
                proxies=Config.requests_proxies("minimax"),
            )
            try:
                data = resp.json()
            except ValueError:
                data = {}
            if data.get("type") == "error":
                err = data.get("error", {})
                raise RuntimeError(f"MiniMax 查询错误[{err.get('type')}]: {err.get('message')}")
            if not resp.ok:
                resp.raise_for_status()
            task = data.get("task", {})
            status = task.get("status")
            if status == "succeeded":
                video_url = (task.get("content") or {}).get("url") or task.get("video_url")
                if not video_url:
                    raise RuntimeError(f"MiniMax 任务成功但未返回视频 URL: {data}")
                return video_url
            if status in ("failed", "cancelled", "expired"):
                error_msg = (
                    (task.get("error") or {}).get("message")
                    or task.get("status_msg")
                    or "未知错误"
                )
                raise RuntimeError(f"MiniMax 视频生成{status}: {error_msg}")
            logger.debug("MinimaxVideoClient: 任务进行中 %s status=%s poll=%d", task_id, status, i + 1)
            time.sleep(interval)
        raise TimeoutError(f"MiniMax 视频生成超时 (task_id={task_id})")

    def _download_video(self, url: str, save_path: str):
        os.makedirs(os.path.dirname(os.path.abspath(save_path)), exist_ok=True)
        resp = requests.get(url, stream=True, timeout=180, proxies=Config.requests_proxies("minimax"))
        resp.raise_for_status()
        with open(save_path, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        logger.info("MinimaxVideoClient: 视频已保存: %s", save_path)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    # 文生视频自测（不需要图片，账户有余额即可跑通）
    OUTPUT_PATH = "code/result/video/test_minimax/h3_t2v.mp4"
    PROMPT = "一只橘猫在雨夜便利店门口张望，电影感，浅景深，暖色灯光"

    print("=== MiniMax-H3 文生视频测试 ===")
    client = MinimaxVideoClient()
    if not client.api_key:
        print("✗ MINIMAX_API_KEY 未设置，请检查 config.yaml 配置")
        sys.exit(1)
    print(f"  API Key : {client.api_key[:8]}***{client.api_key[-4:]}")
    print(f"  Base URL: {client.base_url}")
    try:
        video_url = client.generate_video(
            prompt=PROMPT,
            save_path=OUTPUT_PATH,
            model="MiniMax-H3",
            duration=5,
            ratio="16:9",
            resolution="768P",
        )
        print(f"✓ 视频生成完成！远端 URL: {video_url}")
        print(f"  本地文件: {os.path.abspath(OUTPUT_PATH)}")
        print(f"  文件大小: {os.path.getsize(OUTPUT_PATH) / 1024 / 1024:.2f} MB")
    except Exception as e:
        print(f"✗ 失败: {e}")
        sys.exit(1)
