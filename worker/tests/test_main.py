"""
Unit tests for worker/main.py (FastAPI endpoints)
"""

import unittest
from unittest.mock import patch, MagicMock
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from fastapi.testclient import TestClient


class TestWorkerAPI(unittest.TestCase):
    """Test FastAPI endpoints"""

    @classmethod
    def setUpClass(cls):
        """Set up test client with mocked database"""
        # Mock database before importing main
        with patch('database.Database') as MockDB:
            mock_db = MockDB.return_value
            mock_db.connect = MagicMock()
            mock_db.disconnect = MagicMock()
            mock_db.check_connection.return_value = True
            mock_db.list_jobs.return_value = [
                {'id': 1, 'status': 'completed', 'created_at': '2024-01-01'}
            ]
            mock_db.get_job.return_value = {
                'id': 1, 'status': 'pending', 'created_at': '2024-01-01'
            }
            mock_db.get_download_logs.return_value = []

            # Patch at module level
            import main as main_module
            main_module.db = mock_db
            cls.mock_db = mock_db
            cls.client = TestClient(main_module.app, raise_server_exceptions=False)

    def test_health_check(self):
        """Test health check endpoint"""
        response = self.client.get('/health')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('status', data)
        self.assertIn('database', data)

    def test_list_jobs(self):
        """Test listing jobs"""
        response = self.client.get('/jobs')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('jobs', data)

    def test_get_job(self):
        """Test getting specific job"""
        response = self.client.get('/jobs/1')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('job', data)

    def test_get_nonexistent_job(self):
        """Test 404 for non-existent job"""
        self.mock_db.get_job.return_value = None
        response = self.client.get('/jobs/999')
        self.assertEqual(response.status_code, 404)
        # Reset
        self.mock_db.get_job.return_value = {
            'id': 1, 'status': 'pending', 'created_at': '2024-01-01'
        }

    def test_trigger_pending_job(self):
        """Test triggering a pending job"""
        self.mock_db.get_job.return_value = {
            'id': 1, 'status': 'pending', 'created_at': '2024-01-01'
        }
        response = self.client.post('/jobs/1/trigger')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['status'], 'processing')

    def test_trigger_running_job_fails(self):
        """Test that triggering a running job returns error"""
        self.mock_db.get_job.return_value = {
            'id': 1, 'status': 'running', 'created_at': '2024-01-01'
        }
        response = self.client.post('/jobs/1/trigger')
        self.assertEqual(response.status_code, 400)
        # Reset
        self.mock_db.get_job.return_value = {
            'id': 1, 'status': 'pending', 'created_at': '2024-01-01'
        }


if __name__ == '__main__':
    unittest.main()
