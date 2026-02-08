"""
Finsight Auto - Download Worker
FastAPI service for processing financial report download jobs.
Uses async job polling with sync database operations run in thread pool.
"""

import os
import asyncio
import signal
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from database import Database
from downloader import EarningsDownloader

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger('finsight-worker')

db = Database()
downloader = EarningsDownloader(db)

# Graceful shutdown flag
_shutdown_event = asyncio.Event()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler with graceful shutdown"""
    logger.info("Starting Finsight Auto Worker...")
    db.connect()
    logger.info("Database connected")

    # Start job polling loop
    poll_task = asyncio.create_task(job_polling_loop())

    yield

    # Graceful shutdown
    logger.info("Shutting down worker...")
    _shutdown_event.set()
    poll_task.cancel()
    try:
        await poll_task
    except asyncio.CancelledError:
        pass

    db.disconnect()
    logger.info("Worker shut down cleanly")


app = FastAPI(
    title="Finsight Auto Worker",
    description="Financial report download engine",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def job_polling_loop():
    """Poll for pending download jobs and process them"""
    while not _shutdown_event.is_set():
        try:
            # Run synchronous DB call in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            pending_job = await loop.run_in_executor(None, db.get_next_pending_job)

            if pending_job:
                job_id = pending_job['id']
                logger.info(f"Processing job #{job_id}")
                try:
                    await downloader.process_job(job_id)
                    logger.info(f"Job #{job_id} processing finished")
                except Exception as e:
                    logger.error(f"Job #{job_id} processing error: {e}")
                    db.update_job_status(
                        job_id, 'failed',
                        error_message=str(e)
                    )
            else:
                await asyncio.sleep(10)  # Poll every 10 seconds
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Job polling error: {e}")
            await asyncio.sleep(30)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    loop = asyncio.get_event_loop()
    db_ok = await loop.run_in_executor(None, db.check_connection)
    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
        "service": "finsight-worker",
        "version": "1.0.0",
    }


@app.post("/jobs/{job_id}/trigger")
async def trigger_job(job_id: int, background_tasks: BackgroundTasks):
    """Manually trigger a specific download job"""
    loop = asyncio.get_event_loop()
    job = await loop.run_in_executor(None, db.get_job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job['status'] not in ('pending', 'failed'):
        raise HTTPException(
            status_code=400,
            detail=f"Job status is '{job['status']}', cannot trigger"
        )

    # Reset status if failed
    if job['status'] == 'failed':
        db.update_job_status(job_id, 'pending', error_message=None)

    background_tasks.add_task(downloader.process_job, job_id)
    return {"message": f"Job #{job_id} triggered", "status": "processing"}


@app.get("/jobs")
async def list_jobs(limit: int = 20):
    """List recent download jobs"""
    loop = asyncio.get_event_loop()
    jobs = await loop.run_in_executor(None, db.list_jobs, limit)
    return {"jobs": jobs}


@app.get("/jobs/{job_id}")
async def get_job(job_id: int):
    """Get a specific job with its download logs"""
    loop = asyncio.get_event_loop()
    job = await loop.run_in_executor(None, db.get_job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    logs = await loop.run_in_executor(None, db.get_download_logs, job_id)
    return {"job": job, "logs": logs}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
