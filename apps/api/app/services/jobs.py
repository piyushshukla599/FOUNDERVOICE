"""Analysis job queue — keeps heavy work off the API event loop.

`run_pipeline` is declared async, but almost everything inside it is blocking
CPU work: ffmpeg, soundfile, librosa, numpy, and Whisper. FastAPI background
tasks are awaited *on the event loop*, so running the pipeline there froze the
whole server for the length of an analysis. Health checks, session polling and
new uploads all queued behind it, which looks exactly like the API dying.

Every run now goes to a single worker thread:

* the event loop stays free, so polling and uploads keep responding while a
  recording is being analyzed;
* one analysis at a time, so several Listen clips finishing together cannot all
  load Whisper at once and exhaust memory.
"""

from __future__ import annotations

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Awaitable, Callable

_log = logging.getLogger("foundervoice.jobs")

# One worker: analyses are serialized instead of competing for CPU and RAM.
_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="fv-analysis")


def _run(factory: Callable[[], Awaitable[Any]]) -> Any:
    """Drive one pipeline coroutine to completion inside the worker thread."""
    return asyncio.run(factory())


async def run_analysis(factory: Callable[[], Awaitable[Any]]) -> Any:
    """Await a pipeline run without blocking the API event loop.

    `factory` must build the coroutine lazily — the coroutine has to be created
    inside the worker thread that runs it, not on the caller's loop.
    """
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, _run, factory)


def queue_depth() -> int:
    """Roughly how many analyses are waiting (diagnostics only)."""
    queue = getattr(_executor, "_work_queue", None)
    return queue.qsize() if queue is not None else 0
