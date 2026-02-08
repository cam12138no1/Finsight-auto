"""
Unit tests for worker/database.py
Tests database wrapper methods with mocked psycopg2 connections.
"""

import unittest
from unittest.mock import patch, MagicMock, PropertyMock
import sys
import os

# Add parent directory to path so we can import worker modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from database import Database


class TestDatabase(unittest.TestCase):
    """Test Database class"""

    def setUp(self):
        """Set up test fixtures"""
        self.db = Database()
        self.db.database_url = 'postgresql://test:test@localhost:5432/testdb'

        # Mock the connection pool
        self.mock_pool = MagicMock()
        self.mock_conn = MagicMock()
        self.mock_cursor = MagicMock()

        # Configure mock chain
        self.mock_pool.getconn.return_value = self.mock_conn
        self.mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=self.mock_cursor)
        self.mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)

        self.db._pool = self.mock_pool

    def tearDown(self):
        """Clean up"""
        pass

    # ================================================================
    # Connection Tests
    # ================================================================

    @patch('database.psycopg2.pool.ThreadedConnectionPool')
    def test_connect_success(self, mock_pool_cls):
        """Test successful database connection"""
        db = Database()
        db.database_url = 'postgresql://test:test@localhost/testdb'
        db.connect()
        mock_pool_cls.assert_called_once()
        self.assertIsNotNone(db._pool)

    @patch('database.psycopg2.pool.ThreadedConnectionPool')
    def test_connect_failure_raises(self, mock_pool_cls):
        """Test connection failure raises exception"""
        mock_pool_cls.side_effect = Exception('Connection refused')
        db = Database()
        db.database_url = 'postgresql://test:test@localhost/testdb'
        with self.assertRaises(Exception):
            db.connect()

    def test_disconnect(self):
        """Test disconnecting closes pool"""
        self.db.disconnect()
        self.mock_pool.closeall.assert_called_once()

    def test_check_connection_success(self):
        """Test successful connection check"""
        self.mock_cursor.execute.return_value = None
        result = self.db.check_connection()
        self.assertTrue(result)

    def test_check_connection_failure(self):
        """Test failed connection check"""
        self.mock_cursor.execute.side_effect = Exception('Connection lost')
        self.mock_conn.cursor.return_value.__enter__.side_effect = Exception('Connection lost')
        result = self.db.check_connection()
        self.assertFalse(result)

    # ================================================================
    # Execute Tests
    # ================================================================

    def test_execute_returns_results(self):
        """Test _execute returns rows as list of dicts"""
        mock_rows = [{'id': 1, 'name': 'test'}, {'id': 2, 'name': 'test2'}]
        self.mock_cursor.description = True
        self.mock_cursor.fetchall.return_value = mock_rows
        result = self.db._execute("SELECT * FROM test")
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]['id'], 1)

    def test_execute_no_results(self):
        """Test _execute with no results returns empty list"""
        self.mock_cursor.description = None
        result = self.db._execute("INSERT INTO test VALUES (1)")
        self.assertEqual(result, [])

    def test_execute_one_returns_first(self):
        """Test _execute_one returns first result"""
        self.mock_cursor.description = True
        self.mock_cursor.fetchall.return_value = [{'id': 1}]
        result = self.db._execute_one("SELECT * FROM test LIMIT 1")
        self.assertEqual(result['id'], 1)

    def test_execute_one_returns_none(self):
        """Test _execute_one returns None when no results"""
        self.mock_cursor.description = True
        self.mock_cursor.fetchall.return_value = []
        result = self.db._execute_one("SELECT * FROM test WHERE id = 999")
        self.assertIsNone(result)

    def test_execute_update_returns_rowcount(self):
        """Test _execute_update returns affected rows"""
        self.mock_cursor.rowcount = 3
        result = self.db._execute_update("UPDATE test SET name = 'x'")
        self.assertEqual(result, 3)

    # ================================================================
    # Job Operation Tests
    # ================================================================

    def test_get_next_pending_job(self):
        """Test getting next pending job"""
        expected = {'id': 1, 'status': 'pending'}
        self.mock_cursor.description = True
        self.mock_cursor.fetchall.return_value = [expected]
        result = self.db.get_next_pending_job()
        self.assertEqual(result['id'], 1)
        self.assertEqual(result['status'], 'pending')

    def test_get_next_pending_job_none(self):
        """Test when no pending jobs"""
        self.mock_cursor.description = True
        self.mock_cursor.fetchall.return_value = []
        result = self.db.get_next_pending_job()
        self.assertIsNone(result)

    def test_get_job(self):
        """Test getting specific job"""
        expected = {'id': 42, 'status': 'running'}
        self.mock_cursor.description = True
        self.mock_cursor.fetchall.return_value = [expected]
        result = self.db.get_job(42)
        self.assertEqual(result['id'], 42)

    def test_update_job_status(self):
        """Test updating job status"""
        self.db.update_job_status(1, 'completed', total_files=10)
        self.mock_cursor.execute.assert_called()
        call_args = self.mock_cursor.execute.call_args
        sql = call_args[0][0]
        self.assertIn('status', sql)
        self.assertIn('total_files', sql)

    def test_increment_job_counter_valid(self):
        """Test incrementing valid counter"""
        self.db.increment_job_counter(1, 'completed_files')
        self.mock_cursor.execute.assert_called()

    def test_increment_job_counter_invalid(self):
        """Test incrementing invalid counter raises ValueError"""
        with self.assertRaises(ValueError):
            self.db.increment_job_counter(1, 'invalid_field')

    # ================================================================
    # Company Operation Tests
    # ================================================================

    def test_get_companies_all(self):
        """Test getting all companies"""
        self.mock_cursor.description = True
        self.mock_cursor.fetchall.return_value = [
            {'id': 1, 'ticker': 'MSFT'},
            {'id': 2, 'ticker': 'NVDA'},
        ]
        result = self.db.get_companies()
        self.assertEqual(len(result), 2)

    def test_get_companies_by_ids(self):
        """Test getting companies by IDs"""
        self.mock_cursor.description = True
        self.mock_cursor.fetchall.return_value = [{'id': 1, 'ticker': 'MSFT'}]
        result = self.db.get_companies(ids=[1])
        self.assertEqual(len(result), 1)

    def test_get_companies_by_category(self):
        """Test getting companies by category"""
        self.mock_cursor.description = True
        self.mock_cursor.fetchall.return_value = [{'id': 1, 'ticker': 'MSFT'}]
        result = self.db.get_companies(category='AI_Applications')
        self.assertEqual(len(result), 1)

    # ================================================================
    # Download Log Operation Tests
    # ================================================================

    def test_create_download_log(self):
        """Test creating a download log"""
        self.mock_cursor.description = True
        self.mock_cursor.fetchall.return_value = [{'id': 100}]
        log_id = self.db.create_download_log(1, 1, 2024, 'Q1')
        self.assertEqual(log_id, 100)

    def test_create_download_log_failure(self):
        """Test creating download log when insert fails"""
        self.mock_cursor.description = True
        self.mock_cursor.fetchall.return_value = []
        log_id = self.db.create_download_log(1, 1, 2024, 'Q1')
        self.assertEqual(log_id, 0)

    def test_update_download_log(self):
        """Test updating download log"""
        self.db.update_download_log(1, status='success', file_size=1024)
        self.mock_cursor.execute.assert_called()
        call_args = self.mock_cursor.execute.call_args
        sql = call_args[0][0]
        self.assertIn('status', sql)
        self.assertIn('file_size', sql)
        self.assertIn('updated_at', sql)


if __name__ == '__main__':
    unittest.main()
