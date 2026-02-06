"""
Finsight Auto - Download Worker
FastAPI service for processing financial report download jobs
"""

import os
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, BackgroundTasks
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    logger.info("Starting Finsight Auto Worker...")
    await db.connect()
    logger.info("Database connected")
    # Start job polling loop
    asyncio.create_task(job_polling_loop())
    yield
    await db.disconnect()
    logger.info("Worker shut down")


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
    while True:
        try:
            pending_job = await db.get_next_pending_job()
            if pending_job:
                job_id = pending_job['id']
                logger.info(f"Processing job #{job_id}")
                await downloader.process_job(job_id)
                logger.info(f"Job #{job_id} completed")
            else:
                await asyncio.sleep(10)  # Poll every 10 seconds
        except Exception as e:
            logger.error(f"Job polling error: {e}")
            await asyncio.sleep(30)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    db_ok = await db.check_connection()
    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
        "service": "finsight-worker",
    }


@app.post("/jobs/{job_id}/trigger")
async def trigger_job(job_id: int, background_tasks: BackgroundTasks):
    """Manually trigger a specific download job"""
    job = await db.get_job(job_id)
    if not job:
        return {"error": "Job not found"}, 404
    if job['status'] not in ('pending', 'failed'):
        return {"error": f"Job status is '{job['status']}', cannot trigger"}, 400

    background_tasks.add_task(downloader.process_job, job_id)
    return {"message": f"Job #{job_id} triggered", "status": "processing"}


@app.get("/jobs")
async def list_jobs():
    """List recent download jobs"""
    jobs = await db.list_jobs(limit=20)
    return {"jobs": jobs}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
