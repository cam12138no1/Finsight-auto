"""
Database connection and query utilities for the worker
"""

import os
import logging
from typing import Optional, List, Dict, Any

import psycopg2
import psycopg2.extras

logger = logging.getLogger('finsight-worker.db')


class Database:
    """PostgreSQL database wrapper"""

    def __init__(self):
        self.conn = None
        self.database_url = os.environ.get('DATABASE_URL', '')

    async def connect(self):
        """Establish database connection"""
        try:
            self.conn = psycopg2.connect(
                self.database_url,
                cursor_factory=psycopg2.extras.RealDictCursor,
            )
            self.conn.autocommit = True
            logger.info("Database connected successfully")
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            raise

    async def disconnect(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()

    async def check_connection(self) -> bool:
        """Check if database is reachable"""
        try:
            with self.conn.cursor() as cur:
                cur.execute("SELECT 1")
                return True
        except Exception:
            return False

    def _execute(self, sql: str, params: tuple = None) -> List[Dict[str, Any]]:
        """Execute a query and return results"""
        with self.conn.cursor() as cur:
            cur.execute(sql, params)
            if cur.description:
                return [dict(row) for row in cur.fetchall()]
            return []

    def _execute_one(self, sql: str, params: tuple = None) -> Optional[Dict[str, Any]]:
        """Execute a query and return first result"""
        results = self._execute(sql, params)
        return results[0] if results else None

    def _execute_update(self, sql: str, params: tuple = None) -> int:
        """Execute an update/insert and return affected rows"""
        with self.conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.rowcount

    # Job operations
    async def get_next_pending_job(self) -> Optional[Dict]:
        """Get the next pending download job"""
        return self._execute_one(
            "SELECT * FROM download_jobs WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1"
        )

    async def get_job(self, job_id: int) -> Optional[Dict]:
        """Get a specific job"""
        return self._execute_one("SELECT * FROM download_jobs WHERE id = %s", (job_id,))

    async def list_jobs(self, limit: int = 20) -> List[Dict]:
        """List recent jobs"""
        return self._execute(
            "SELECT * FROM download_jobs ORDER BY created_at DESC LIMIT %s", (limit,)
        )

    async def update_job_status(self, job_id: int, status: str, **kwargs):
        """Update job status and metadata"""
        sets = ["status = %s"]
        params = [status]

        for key, value in kwargs.items():
            sets.append(f"{key} = %s")
            params.append(value)

        params.append(job_id)
        sql = f"UPDATE download_jobs SET {', '.join(sets)} WHERE id = %s"
        self._execute_update(sql, tuple(params))

    async def increment_job_counter(self, job_id: int, field: str):
        """Increment a job counter (completed_files or failed_files)"""
        self._execute_update(
            f"UPDATE download_jobs SET {field} = {field} + 1 WHERE id = %s",
            (job_id,)
        )

    # Company operations
    async def get_companies(self, ids: List[int] = None, category: str = None) -> List[Dict]:
        """Get companies with optional filters"""
        sql = "SELECT * FROM companies WHERE is_active = true"
        params = []

        if ids:
            sql += " AND id = ANY(%s)"
            params.append(ids)
        if category:
            sql += " AND category = %s"
            params.append(category)

        sql += " ORDER BY category, name"
        return self._execute(sql, tuple(params) if params else None)

    async def get_all_companies(self) -> List[Dict]:
        """Get all active companies"""
        return self._execute(
            "SELECT * FROM companies WHERE is_active = true ORDER BY category, name"
        )

    # Download log operations
    async def create_download_log(self, job_id: int, company_id: int, year: int, quarter: str) -> int:
        """Create a download log entry"""
        result = self._execute_one(
            """INSERT INTO download_logs (job_id, company_id, year, quarter, status)
               VALUES (%s, %s, %s, %s, 'pending') RETURNING id""",
            (job_id, company_id, year, quarter)
        )
        return result['id'] if result else 0

    async def update_download_log(self, log_id: int, **kwargs):
        """Update a download log entry"""
        sets = []
        params = []

        for key, value in kwargs.items():
            sets.append(f"{key} = %s")
            params.append(value)

        sets.append("updated_at = NOW()")
        params.append(log_id)
        sql = f"UPDATE download_logs SET {', '.join(sets)} WHERE id = %s"
        self._execute_update(sql, tuple(params))
