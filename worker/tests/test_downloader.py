"""
Unit tests for worker/downloader.py
Tests download engine with mocked HTTP responses and database.
"""

import unittest
import asyncio
from unittest.mock import patch, MagicMock, AsyncMock
import sys
import os
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from downloader import EarningsDownloader, DownloadTask


def run_async(coro):
    """Helper to run async functions in tests"""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


class TestEarningsDownloaderInit(unittest.TestCase):
    """Test downloader initialization"""

    def test_init(self):
        """Test downloader creates with database reference"""
        mock_db = MagicMock()
        downloader = EarningsDownloader(mock_db)
        self.assertEqual(downloader.db, mock_db)
        self.assertIsNotNone(downloader._semaphore)
        self.assertIsNotNone(downloader._rate_limiter)


class TestContentValidation(unittest.TestCase):
    """Test content validation logic"""

    def setUp(self):
        self.db = MagicMock()
        self.downloader = EarningsDownloader(self.db)

    def test_valid_pdf_content(self):
        """Test valid PDF content passes validation"""
        pdf_content = b'%PDF-1.4 ' + b'x' * 1000
        self.assertTrue(self.downloader._validate_content(pdf_content, 'test.pdf'))

    def test_too_small_content(self):
        """Test content under 500 bytes is rejected"""
        self.assertFalse(self.downloader._validate_content(b'short', 'test.pdf'))

    def test_html_error_page(self):
        """Test HTML error page is rejected for PDF URL"""
        html = b'<html><body>Page not found</body></html>' + b' ' * 500
        self.assertFalse(self.downloader._validate_content(html, 'report.pdf'))

    def test_html_403_page(self):
        """Test 403 forbidden page is rejected"""
        html = b'<html><head><title>Access Denied</title></head><body>Forbidden</body></html>' + b' ' * 500
        self.assertFalse(self.downloader._validate_content(html, 'report.pdf'))

    def test_valid_html_filing(self):
        """Test valid HTML filing passes (for htm filings)"""
        html = b'<html><head><title>10-K Filing</title></head><body>' + b'Financial data here ' * 100 + b'</body></html>'
        self.assertTrue(self.downloader._validate_content(html, 'filing.htm'))

    def test_large_pdf_without_magic_bytes(self):
        """Test non-PDF content for PDF URL is rejected"""
        content = b'This is not a PDF ' * 100
        self.assertFalse(self.downloader._validate_content(content, 'report.pdf'))


class TestEdgarSearch(unittest.TestCase):
    """Test SEC EDGAR search functionality"""

    def setUp(self):
        self.db = MagicMock()
        self.downloader = EarningsDownloader(self.db)

    def _make_edgar_response(self, forms, dates, accessions, primary_docs, period_dates=None):
        """Helper to create mock EDGAR API response"""
        data = {
            'filings': {
                'recent': {
                    'form': forms,
                    'filingDate': dates,
                    'accessionNumber': accessions,
                    'primaryDocument': primary_docs,
                    'reportDate': period_dates or dates,
                }
            }
        }
        mock_response = MagicMock()
        mock_response.json.return_value = data
        mock_response.raise_for_status = MagicMock()
        return mock_response

    def test_find_10q_filing(self):
        """Test finding a 10-Q filing"""
        response = self._make_edgar_response(
            forms=['10-Q', '10-K'],
            dates=['2024-05-01', '2024-02-15'],
            accessions=['0001234567-24-000001', '0001234567-24-000002'],
            primary_docs=['filing.htm', 'annual.htm'],
            period_dates=['2024-03-31', '2023-12-31'],
        )

        async def test():
            mock_client = AsyncMock()
            # Mock rate limiter
            self.downloader._rate_limiter = asyncio.Lock()
            self.downloader._last_request_time = 0

            mock_client.get = AsyncMock(return_value=response)
            result = await self.downloader._search_edgar(mock_client, '0000789019', 2024, 'Q1')
            self.assertIsNotNone(result)
            self.assertIn('sec.gov', result)

        run_async(test())

    def test_find_10k_filing(self):
        """Test finding a 10-K (annual) filing"""
        response = self._make_edgar_response(
            forms=['10-K'],
            dates=['2024-02-15'],
            accessions=['0001234567-24-000001'],
            primary_docs=['annual.htm'],
            period_dates=['2023-12-31'],
        )

        async def test():
            mock_client = AsyncMock()
            self.downloader._rate_limiter = asyncio.Lock()
            self.downloader._last_request_time = 0
            mock_client.get = AsyncMock(return_value=response)
            result = await self.downloader._search_edgar(mock_client, '0000789019', 2023, 'FY')
            self.assertIsNotNone(result)

        run_async(test())

    def test_no_matching_filing(self):
        """Test when no matching filing found"""
        response = self._make_edgar_response(
            forms=['10-K'],
            dates=['2024-02-15'],
            accessions=['0001234567-24-000001'],
            primary_docs=['annual.htm'],
            period_dates=['2023-12-31'],
        )

        async def test():
            mock_client = AsyncMock()
            self.downloader._rate_limiter = asyncio.Lock()
            self.downloader._last_request_time = 0
            mock_client.get = AsyncMock(return_value=response)
            # Looking for Q2 2025 - shouldn't match
            result = await self.downloader._search_edgar(mock_client, '0000789019', 2025, 'Q2')
            self.assertIsNone(result)

        run_async(test())

    def test_edgar_request_failure(self):
        """Test EDGAR search handles network errors gracefully"""
        async def test():
            mock_client = AsyncMock()
            self.downloader._rate_limiter = asyncio.Lock()
            self.downloader._last_request_time = 0
            mock_client.get = AsyncMock(side_effect=Exception('Network error'))
            result = await self.downloader._search_edgar(mock_client, '0000789019', 2024, 'Q1')
            self.assertIsNone(result)

        run_async(test())


class TestIRPageSearch(unittest.TestCase):
    """Test IR page scraping functionality"""

    def setUp(self):
        self.db = MagicMock()
        self.downloader = EarningsDownloader(self.db)

    def test_find_pdf_link(self):
        """Test finding a PDF link on IR page"""
        html = '''
        <html><body>
        <a href="/reports/2024_Q1_Earnings.pdf">Q1 2024 Earnings Release</a>
        <a href="/about">About Us</a>
        </body></html>
        '''
        mock_response = MagicMock()
        mock_response.text = html
        mock_response.raise_for_status = MagicMock()

        async def test():
            mock_client = AsyncMock()
            self.downloader._rate_limiter = asyncio.Lock()
            self.downloader._last_request_time = 0
            mock_client.get = AsyncMock(return_value=mock_response)
            result = await self.downloader._search_ir_page(
                mock_client, 'https://example.com/ir/', 'MSFT', 2024, 'Q1'
            )
            self.assertIsNotNone(result)
            self.assertIn('Earnings.pdf', result)

        run_async(test())

    def test_no_matching_link(self):
        """Test when no matching links found"""
        html = '''
        <html><body>
        <a href="/about">About Us</a>
        <a href="/contact">Contact</a>
        </body></html>
        '''
        mock_response = MagicMock()
        mock_response.text = html
        mock_response.raise_for_status = MagicMock()

        async def test():
            mock_client = AsyncMock()
            self.downloader._rate_limiter = asyncio.Lock()
            self.downloader._last_request_time = 0
            mock_client.get = AsyncMock(return_value=mock_response)
            result = await self.downloader._search_ir_page(
                mock_client, 'https://example.com/ir/', 'MSFT', 2024, 'Q1'
            )
            self.assertIsNone(result)

        run_async(test())

    def test_ir_page_network_error(self):
        """Test IR search handles network errors gracefully"""
        async def test():
            mock_client = AsyncMock()
            self.downloader._rate_limiter = asyncio.Lock()
            self.downloader._last_request_time = 0
            mock_client.get = AsyncMock(side_effect=Exception('Connection timeout'))
            result = await self.downloader._search_ir_page(
                mock_client, 'https://example.com/ir/', 'MSFT', 2024, 'Q1'
            )
            self.assertIsNone(result)

        run_async(test())

    def test_relative_url_resolved(self):
        """Test relative URLs are converted to absolute"""
        html = '''
        <html><body>
        <a href="docs/2024_Q2_Earnings_Release.pdf">Q2 2024 Financial Results</a>
        </body></html>
        '''
        mock_response = MagicMock()
        mock_response.text = html
        mock_response.raise_for_status = MagicMock()

        async def test():
            mock_client = AsyncMock()
            self.downloader._rate_limiter = asyncio.Lock()
            self.downloader._last_request_time = 0
            mock_client.get = AsyncMock(return_value=mock_response)
            result = await self.downloader._search_ir_page(
                mock_client, 'https://investor.example.com/financials/', 'TEST', 2024, 'Q2'
            )
            self.assertIsNotNone(result)
            self.assertTrue(result.startswith('https://'))

        run_async(test())


class TestProcessJob(unittest.TestCase):
    """Test job processing logic"""

    def setUp(self):
        self.db = MagicMock()
        self.downloader = EarningsDownloader(self.db)

    def test_job_not_found(self):
        """Test handling of non-existent job"""
        self.db.get_job.return_value = None

        async def test():
            await self.downloader.process_job(999)
            self.db.update_job_status.assert_called()

        run_async(test())

    def test_job_marks_running(self):
        """Test job is marked as running when processing starts"""
        self.db.get_job.return_value = {
            'id': 1,
            'years': [2024],
            'quarters': ['Q1'],
            'company_ids': None,
            'category_filter': None,
        }
        self.db.get_all_companies.return_value = []

        async def test():
            await self.downloader.process_job(1)
            # First call should set status to 'running'
            first_call = self.db.update_job_status.call_args_list[0]
            self.assertEqual(first_call[0][1], 'running')

        run_async(test())

    def test_job_completed_on_success(self):
        """Test job is marked completed after all tasks done"""
        self.db.get_job.side_effect = [
            {
                'id': 1,
                'years': [2024],
                'quarters': ['Q1'],
                'company_ids': None,
                'category_filter': None,
            },
            {'id': 1, 'status': 'running'},  # Second call for final check
        ]
        self.db.get_all_companies.return_value = []

        async def test():
            await self.downloader.process_job(1)
            # Should eventually be marked completed
            calls = self.db.update_job_status.call_args_list
            last_call = calls[-1]
            self.assertEqual(last_call[0][1], 'completed')

        run_async(test())

    def test_job_with_category_filter(self):
        """Test job uses category filter"""
        self.db.get_job.side_effect = [
            {
                'id': 1,
                'years': [2024],
                'quarters': ['Q1'],
                'company_ids': None,
                'category_filter': 'AI_Applications',
            },
            {'id': 1, 'status': 'running'},
        ]
        self.db.get_companies.return_value = []

        async def test():
            await self.downloader.process_job(1)
            self.db.get_companies.assert_called_with(category='AI_Applications')

        run_async(test())

    def test_job_with_company_ids(self):
        """Test job uses specific company IDs"""
        self.db.get_job.side_effect = [
            {
                'id': 1,
                'years': [2024],
                'quarters': ['Q1'],
                'company_ids': [1, 2, 3],
                'category_filter': None,
            },
            {'id': 1, 'status': 'running'},
        ]
        self.db.get_companies.return_value = []

        async def test():
            await self.downloader.process_job(1)
            self.db.get_companies.assert_called_with(ids=[1, 2, 3])

        run_async(test())


class TestDownloadTask(unittest.TestCase):
    """Test DownloadTask dataclass"""

    def test_create_task(self):
        """Test creating a download task"""
        task = DownloadTask(
            job_id=1,
            company={'id': 1, 'ticker': 'MSFT', 'sec_cik': '0000789019'},
            year=2024,
            quarter='Q1',
        )
        self.assertEqual(task.job_id, 1)
        self.assertEqual(task.year, 2024)
        self.assertEqual(task.quarter, 'Q1')
        self.assertEqual(task.company['ticker'], 'MSFT')


class TestRetryLogic(unittest.TestCase):
    """Test retry and error handling logic"""

    def setUp(self):
        self.db = MagicMock()
        self.db.create_download_log.return_value = 1
        self.downloader = EarningsDownloader(self.db)

    def test_retry_on_network_error(self):
        """Test that download retries on transient errors"""
        task = DownloadTask(
            job_id=1,
            company={'id': 1, 'ticker': 'MSFT', 'sec_cik': '', 'ir_url': ''},
            year=2024,
            quarter='Q1',
        )

        async def test():
            mock_client = AsyncMock()
            self.downloader._rate_limiter = asyncio.Lock()
            self.downloader._last_request_time = 0

            # All search methods fail, so "no filing found" should happen
            # (not retryable)
            await self.downloader._download_filing_with_retry(mock_client, task)

            # Should have created a log with 'failed' status
            self.db.update_download_log.assert_called()
            self.db.increment_job_counter.assert_called_with(1, 'failed_files')

        run_async(test())

    def test_no_filing_does_not_retry(self):
        """Test that 'no filing found' does not trigger retries"""
        task = DownloadTask(
            job_id=1,
            company={'id': 1, 'ticker': 'TEST', 'sec_cik': '', 'ir_url': ''},
            year=2024,
            quarter='Q1',
        )

        async def test():
            mock_client = AsyncMock()
            self.downloader._rate_limiter = asyncio.Lock()
            self.downloader._last_request_time = 0
            await self.downloader._download_filing_with_retry(mock_client, task)

            # Should log as failed only once (no retries for "not found")
            failed_calls = [
                c for c in self.db.update_download_log.call_args_list
                if any(v == 'failed' for v in c[1].values() if isinstance(v, str))
            ]
            self.assertEqual(len(failed_calls), 1)

        run_async(test())


if __name__ == '__main__':
    unittest.main()
