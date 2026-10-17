import logging
import traceback

from . import action_transfer, audio_book, digital_human, image_animate, meme_factory, song_mv, standard, video_understand
from .storage import mark_completed, mark_failed, mark_running, update_task

logger = logging.getLogger(__name__)

PIPELINE_REGISTRY = {
    "standard": standard.run,
    "quick_create": standard.run,
    "action_transfer": action_transfer.run,
    "digital_human": digital_human.run,
    "image_animate": image_animate.run,
    "meme_factory": meme_factory.run,
    "video_understand": video_understand.run,
    "song_mv": song_mv.run,
    "audio_book": audio_book.run,
}


async def run_pipeline_task(task_id: str, pipeline: str, params: dict) -> None:
    runner = PIPELINE_REGISTRY[pipeline]
    try:
        logger.info("Pipeline task started: task_id=%s pipeline=%s", task_id, pipeline)
        mark_running(task_id)
        output, artifacts = await runner(task_id, params)
        mark_completed(task_id, output=output, artifacts=artifacts)
        logger.info(
            "Pipeline task completed: task_id=%s pipeline=%s artifacts=%d",
            task_id,
            pipeline,
            len(artifacts or []),
        )
    except Exception as exc:
        logger.exception("Pipeline task failed: task_id=%s pipeline=%s", task_id, pipeline)
        update_task(task_id, progress=0)
        mark_failed(task_id, f"{exc}\n{traceback.format_exc()}")
