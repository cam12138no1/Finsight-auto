"""
Database connection and query utilities for the worker.
Synchronous psycopg2 with ThreadedConnectionPool.
Column-name whitelists prevent SQL injection on dynamic updates.
"""

import os
import logging
from typing import Optional, List, Dict, Any
from contextlib import contextmanager

import psycopg2
import psycopg2.extras
import psycopg2.pool

logger = logging.getLogger('finsight-worker.db')

# Whitelists for dynamic column updates (prevents SQL injection)
_JOB_UPDATE_COLUMNS = frozenset({
    'status', 'started_at', 'completed_at', 'error_message',
    'total_files', 'completed_files', 'failed_files',
})
_LOG_UPDATE_COLUMNS = frozenset({
    'status', 'filename', 'file_url', 'file_size',
    'error_message', 'download_duration_ms',
})


class Database:
    """PostgreSQL database wrapper with connection pooling"""

    def __init__(self):
        self._pool: Optional[psycopg2.pool.ThreadedConnectionPool] = None
        self.database_url = os.environ.get('DATABASE_URL', '')

    def connect(self):
        try:
            self._pool = psycopg2.pool.ThreadedConnectionPool(
                minconn=1, maxconn=5,
                dsn=self.database_url,
                cursor_factory=psycopg2.extras.RealDictCursor,
            )
            logger.info("Database pool created")
        except Exception as e:
            logger.error(f"DB connection failed: {e}")
            raise

    def disconnect(self):
        if self._pool:
            self._pool.closeall()

    @contextmanager
    def _get_conn(self):
        if self._pool is None:
            raise RuntimeError("Database not connected. Call connect() first.")
        conn = self._pool.getconn()
        conn.autocommit = True
        try:
            yield conn
        finally:
            self._pool.putconn(conn)

    def check_connection(self) -> bool:
        try:
            with self._get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
                    return True
        except Exception:
            return False

    def _execute(self, sql: str, params: tuple = None) -> List[Dict[str, Any]]:
        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                if cur.description:
                    return [dict(row) for row in cur.fetchall()]
                return []

    def _execute_one(self, sql: str, params: tuple = None) -> Optional[Dict[str, Any]]:
        results = self._execute(sql, params)
        return results[0] if results else None

    def _execute_update(self, sql: str, params: tuple = None) -> int:
        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                return cur.rowcount

    # ----------------------------------------------------------------
    # Job operations
    # ----------------------------------------------------------------
    def get_next_pending_job(self) -> Optional[Dict]:
        return self._execute_one(
            "SELECT * FROM download_jobs WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1"
        )

    def get_job(self, job_id: int) -> Optional[Dict]:
        return self._execute_one("SELECT * FROM download_jobs WHERE id = %s", (job_id,))

    def list_jobs(self, limit: int = 20) -> List[Dict]:
        return self._execute(
            "SELECT * FROM download_jobs ORDER BY created_at DESC LIMIT %s", (limit,)
        )

    def update_job_status(self, job_id: int, status: str, **kwargs):
        """Update job status. Only whitelisted columns are allowed."""
        sets = ["status = %s"]
        params: list = [status]
        for key, value in kwargs.items():
            if key not in _JOB_UPDATE_COLUMNS:
                raise ValueError(f"Invalid column for job update: {key}")
            sets.append(f"{key} = %s")
            params.append(value)
        params.append(job_id)
        self._execute_update(f"UPDATE download_jobs SET {', '.join(sets)} WHERE id = %s", tuple(params))

    def increment_job_counter(self, job_id: int, field: str):
        allowed = {'completed_files', 'failed_files'}
        if field not in allowed:
            raise ValueError(f"Invalid counter field: {field}")
        self._execute_update(
            f"UPDATE download_jobs SET {field} = {field} + 1 WHERE id = %s", (job_id,)
        )

    # ----------------------------------------------------------------
    # Company operations
    # ----------------------------------------------------------------
    def get_companies(self, ids: Optional[List[int]] = None, category: Optional[str] = None) -> List[Dict]:
        sql = "SELECT * FROM companies WHERE is_active = true"
        params: list = []
        if ids:
            sql += " AND id = ANY(%s)"
            params.append(ids)
        if category:
            sql += " AND category = %s"
            params.append(category)
        sql += " ORDER BY category, name"
        return self._execute(sql, tuple(params) if params else None)

    def get_all_companies(self) -> List[Dict]:
        return self._execute("SELECT * FROM companies WHERE is_active = true ORDER BY category, name")

    # ----------------------------------------------------------------
    # Download log operations
    # ----------------------------------------------------------------
    def create_download_log(self, job_id: int, company_id: int, year: int, quarter: str) -> int:
        result = self._execute_one(
            """INSERT INTO download_logs (job_id, company_id, year, quarter, status)
               VALUES (%s, %s, %s, %s, 'pending') RETURNING id""",
            (job_id, company_id, year, quarter)
        )
        return result['id'] if result else 0

    def update_download_log(self, log_id: int, **kwargs):
        """Update download log. Only whitelisted columns are allowed."""
        sets: list = []
        params: list = []
        for key, value in kwargs.items():
            if key not in _LOG_UPDATE_COLUMNS:
                raise ValueError(f"Invalid column for log update: {key}")
            sets.append(f"{key} = %s")
            params.append(value)
        sets.append("updated_at = NOW()")
        params.append(log_id)
        self._execute_update(f"UPDATE download_logs SET {', '.join(sets)} WHERE id = %s", tuple(params))

    def get_download_logs(self, job_id: int) -> List[Dict]:
        return self._execute(
            """SELECT dl.*, c.name as company_name, c.ticker as company_ticker
               FROM download_logs dl
               LEFT JOIN companies c ON dl.company_id = c.id
               WHERE dl.job_id = %s ORDER BY dl.created_at""",
            (job_id,)
        )

    # ----------------------------------------------------------------
    # Shared filings (财报永久存储, 所有用户共享, 按公司/年/季度去重)
    # ----------------------------------------------------------------
    def get_shared_filing(self, company_id: int, year: int, quarter: str) -> Optional[Dict]:
        return self._execute_one(
            """SELECT id, company_id, year, quarter, filename, file_url, content_type, file_size, created_at
               FROM shared_filings WHERE company_id = %s AND year = %s AND quarter = %s""",
            (company_id, year, quarter)
        )

    def save_shared_filing(
        self, company_id: int, year: int, quarter: str,
        filename: str, file_url: str, content_type: str,
        file_content: bytes, source: str = 'sec_edgar'
    ) -> int:
        existing = self.get_shared_filing(company_id, year, quarter)
        if existing:
            logger.info(f"Filing already exists: company={company_id} {year} {quarter}, skipping")
            return existing['id']

        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO shared_filings
                       (company_id, year, quarter, filename, file_url, content_type, file_size, file_content, source)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                       ON CONFLICT (company_id, year, quarter) DO NOTHING
                       RETURNING id""",
                    (company_id, year, quarter, filename, file_url, content_type,
                     len(file_content), psycopg2.Binary(file_content), source)
                )
                row = cur.fetchone()
                return row['id'] if row else 0

    def get_shared_filing_content(self, filing_id: int) -> Optional[Dict]:
        return self._execute_one("SELECT * FROM shared_filings WHERE id = %s", (filing_id,))

    def list_shared_filings(self, company_id: Optional[int] = None) -> List[Dict]:
        sql = """SELECT sf.id, sf.company_id, sf.year, sf.quarter, sf.filename,
                        sf.file_url, sf.content_type, sf.file_size, sf.source, sf.created_at,
                        c.name as company_name, c.ticker as company_ticker, c.category
                 FROM shared_filings sf
                 LEFT JOIN companies c ON sf.company_id = c.id"""
        params: list = []
        if company_id:
            sql += " WHERE sf.company_id = %s"
            params.append(company_id)
        sql += " ORDER BY sf.year DESC, sf.quarter, c.name"
        return self._execute(sql, tuple(params) if params else None)

    # ----------------------------------------------------------------
    # User reports (用户研报, 各自上传)
    # ----------------------------------------------------------------
    def save_user_report(
        self, title: str, filename: str, content_type: str,
        file_content: bytes, uploader_name: str = 'anonymous',
        company_id: Optional[int] = None, year: Optional[int] = None,
        quarter: Optional[str] = None, description: str = ''
    ) -> int:
        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO user_reports
                       (uploader_name, company_id, title, description, year, quarter,
                        filename, content_type, file_size, file_content)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                       RETURNING id""",
                    (uploader_name, company_id, title, description, year, quarter,
                     filename, content_type, len(file_content), psycopg2.Binary(file_content))
                )
                row = cur.fetchone()
                return row['id'] if row else 0

    def get_user_report(self, report_id: int) -> Optional[Dict]:
        return self._execute_one("SELECT * FROM user_reports WHERE id = %s", (report_id,))

    def list_user_reports(self, company_id: Optional[int] = None) -> List[Dict]:
        sql = """SELECT id, uploader_name, company_id, title, description,
                        year, quarter, filename, content_type, file_size, created_at
                 FROM user_reports"""
        params: list = []
        if company_id:
            sql += " WHERE company_id = %s"
            params.append(company_id)
        sql += " ORDER BY created_at DESC"
        return self._execute(sql, tuple(params) if params else None)

    def delete_user_report(self, report_id: int) -> bool:
        return self._execute_update("DELETE FROM user_reports WHERE id = %s", (report_id,)) > 0
