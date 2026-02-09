"""
Finsight Auto - Download Worker
FastAPI service for processing financial report download jobs.
Files are stored permanently in PostgreSQL (no filesystem dependency).
"""

import os
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, BackgroundTasks, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
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

_shutdown_event = asyncio.Event()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Finsight Auto Worker...")
    db.connect()
    logger.info("Database connected")
    poll_task = asyncio.create_task(job_polling_loop())
    yield
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
    while not _shutdown_event.is_set():
        try:
            loop = asyncio.get_event_loop()
            pending_job = await loop.run_in_executor(None, db.get_next_pending_job)
            if pending_job:
                job_id = pending_job['id']
                logger.info(f"Processing job #{job_id}")
                try:
                    await downloader.process_job(job_id)
                except Exception as e:
                    logger.error(f"Job #{job_id} error: {e}")
                    db.update_job_status(job_id, 'failed', error_message=str(e))
            else:
                await asyncio.sleep(10)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Polling error: {e}")
            await asyncio.sleep(30)


# ================================================================
# Health
# ================================================================
@app.get("/health")
async def health_check():
    loop = asyncio.get_event_loop()
    db_ok = await loop.run_in_executor(None, db.check_connection)
    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
        "service": "finsight-worker",
        "version": "1.0.0",
    }


# ================================================================
# Jobs
# ================================================================
@app.post("/jobs/{job_id}/trigger")
async def trigger_job(job_id: int, background_tasks: BackgroundTasks):
    loop = asyncio.get_event_loop()
    job = await loop.run_in_executor(None, db.get_job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job['status'] not in ('pending', 'failed'):
        raise HTTPException(status_code=400, detail=f"Job status is '{job['status']}'")
    if job['status'] == 'failed':
        db.update_job_status(job_id, 'pending', error_message=None)
    background_tasks.add_task(downloader.process_job, job_id)
    return {"message": f"Job #{job_id} triggered", "status": "processing"}


@app.get("/jobs")
async def list_jobs(limit: int = 20):
    loop = asyncio.get_event_loop()
    jobs = await loop.run_in_executor(None, db.list_jobs, limit)
    return {"jobs": jobs}


@app.get("/jobs/{job_id}")
async def get_job(job_id: int):
    loop = asyncio.get_event_loop()
    job = await loop.run_in_executor(None, db.get_job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    logs = await loop.run_in_executor(None, db.get_download_logs, job_id)
    return {"job": job, "logs": logs}


# ================================================================
# Shared Filings (财报下载 - 所有用户共享, 存在PostgreSQL里)
# ================================================================
@app.get("/filings")
async def list_filings(company_id: int = None):
    """List all shared filings metadata (no content)"""
    loop = asyncio.get_event_loop()
    filings = await loop.run_in_executor(None, db.list_shared_filings, company_id)
    return {"filings": filings, "total": len(filings)}


@app.get("/filings/{filing_id}/download")
async def download_filing(filing_id: int):
    """Download a shared filing by ID"""
    loop = asyncio.get_event_loop()
    filing = await loop.run_in_executor(None, db.get_shared_filing_content, filing_id)
    if not filing:
        raise HTTPException(status_code=404, detail="Filing not found")

    content = bytes(filing['file_content'])
    return Response(
        content=content,
        media_type=filing.get('content_type', 'application/octet-stream'),
        headers={
            "Content-Disposition": f"attachment; filename=\"{filing['filename']}\"",
            "Content-Length": str(len(content)),
        }
    )


# ================================================================
# User Reports (用户研报上传 - 各人独立)
# ================================================================
@app.get("/reports")
async def list_reports(company_id: int = None):
    """List user-uploaded research reports"""
    loop = asyncio.get_event_loop()
    reports = await loop.run_in_executor(None, db.list_user_reports, company_id)
    return {"reports": reports, "total": len(reports)}


@app.post("/reports/upload")
async def upload_report(
    file: UploadFile = File(...),
    title: str = Form(...),
    uploader_name: str = Form(default="anonymous"),
    company_id: int = Form(default=None),
    year: int = Form(default=None),
    quarter: str = Form(default=None),
    description: str = Form(default=""),
):
    """Upload a user research report"""
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:  # 50MB limit
        raise HTTPException(status_code=413, detail="File too large (max 50MB)")

    report_id = db.save_user_report(
        title=title,
        filename=file.filename or "report.pdf",
        content_type=file.content_type or "application/octet-stream",
        file_content=content,
        uploader_name=uploader_name,
        company_id=company_id if company_id else None,
        year=year if year else None,
        quarter=quarter if quarter else None,
        description=description,
    )
    return {"id": report_id, "message": "Report uploaded successfully"}


@app.get("/reports/{report_id}/download")
async def download_report(report_id: int):
    """Download a user research report"""
    loop = asyncio.get_event_loop()
    report = await loop.run_in_executor(None, db.get_user_report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    content = bytes(report['file_content'])
    return Response(
        content=content,
        media_type=report.get('content_type', 'application/octet-stream'),
        headers={
            "Content-Disposition": f"attachment; filename=\"{report['filename']}\"",
            "Content-Length": str(len(content)),
        }
    )


@app.delete("/reports/{report_id}")
async def delete_report(report_id: int):
    """Delete a user research report"""
    loop = asyncio.get_event_loop()
    ok = await loop.run_in_executor(None, db.delete_user_report, report_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"message": "Report deleted"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
