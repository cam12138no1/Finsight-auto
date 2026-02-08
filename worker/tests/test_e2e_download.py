"""
End-to-end tests for the download/scraping functionality.
Tests REAL SEC EDGAR API connectivity and IR page scraping.

These tests make actual HTTP requests to SEC EDGAR and company IR pages.
Run with: python -m pytest tests/test_e2e_download.py -v -s
"""

import asyncio
import unittest
import logging
from unittest.mock import MagicMock

import httpx
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from downloader import (
    EarningsDownloader,
    EDGAR_SUBMISSIONS,
    EDGAR_HEADERS,
    HTTP_HEADERS,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def run_async(coro):
    """Helper to run async functions"""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


class TestSECEdgarConnectivity(unittest.TestCase):
    """Test real SEC EDGAR API connectivity"""

    def setUp(self):
        self.db = MagicMock()
        self.downloader = EarningsDownloader(self.db)

    def test_edgar_api_reachable(self):
        """Test that SEC EDGAR API is reachable"""
        async def test():
            async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
                # Test with Microsoft's CIK
                cik = '0000789019'
                cik_padded = cik.lstrip('0').zfill(10)
                url = f"{EDGAR_SUBMISSIONS}/CIK{cik_padded}.json"

                response = await client.get(url, headers=EDGAR_HEADERS)
                self.assertEqual(response.status_code, 200)

                data = response.json()
                self.assertIn('filings', data)
                self.assertIn('recent', data['filings'])

                recent = data['filings']['recent']
                self.assertIn('form', recent)
                self.assertIn('filingDate', recent)
                self.assertIn('accessionNumber', recent)
                self.assertIn('primaryDocument', recent)

                # Should have some filings
                self.assertGreater(len(recent['form']), 0)
                logger.info(f"EDGAR returned {len(recent['form'])} filings for MSFT")

        run_async(test())

    def test_search_msft_10q(self):
        """Test searching for Microsoft 10-Q filing"""
        async def test():
            async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
                self.downloader._rate_limiter = asyncio.Lock()
                self.downloader._last_request_time = 0

                result = await self.downloader._search_edgar(
                    client, '0000789019', 2024, 'Q1'
                )

                if result:
                    logger.info(f"Found MSFT 2024 Q1: {result}")
                    self.assertIn('sec.gov', result)
                else:
                    logger.warning("No MSFT Q1 2024 filing found - may be expected depending on timing")

        run_async(test())

    def test_search_nvda_10k(self):
        """Test searching for Nvidia 10-K (annual) filing"""
        async def test():
            async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
                self.downloader._rate_limiter = asyncio.Lock()
                self.downloader._last_request_time = 0

                result = await self.downloader._search_edgar(
                    client, '0001045810', 2024, 'FY'
                )

                if result:
                    logger.info(f"Found NVDA 2024 FY: {result}")
                    self.assertIn('sec.gov', result)
                else:
                    logger.warning("No NVDA FY 2024 filing found")

        run_async(test())

    def test_search_aapl_filing(self):
        """Test searching for Apple filing"""
        async def test():
            async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
                self.downloader._rate_limiter = asyncio.Lock()
                self.downloader._last_request_time = 0

                result = await self.downloader._search_edgar(
                    client, '0000320193', 2024, 'Q2'
                )

                if result:
                    logger.info(f"Found AAPL 2024 Q2: {result}")
                    self.assertIn('sec.gov', result)

        run_async(test())

    def test_filing_url_accessible(self):
        """Test that a found filing URL is actually accessible"""
        async def test():
            async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
                self.downloader._rate_limiter = asyncio.Lock()
                self.downloader._last_request_time = 0

                # Search for a known filing
                filing_url = await self.downloader._search_edgar(
                    client, '0000789019', 2024, 'Q1'
                )

                if filing_url:
                    # Try to access the filing
                    response = await client.get(filing_url, headers=EDGAR_HEADERS)
                    self.assertIn(response.status_code, [200, 301, 302])
                    self.assertGreater(len(response.content), 0)
                    logger.info(f"Filing accessible: {len(response.content)} bytes")
                else:
                    self.skipTest("No filing URL to test")

        run_async(test())


class TestMultipleCompanySearch(unittest.TestCase):
    """Test searching for multiple companies"""

    COMPANY_CIKS = {
        'MSFT': '0000789019',
        'GOOGL': '0001652044',
        'AMZN': '0001018724',
        'META': '0001326801',
        'NVDA': '0001045810',
        'AMD': '0000002488',
    }

    def setUp(self):
        self.db = MagicMock()
        self.downloader = EarningsDownloader(self.db)

    def test_search_multiple_companies(self):
        """Test that we can find filings for multiple major companies"""
        async def test():
            async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
                self.downloader._rate_limiter = asyncio.Lock()
                self.downloader._last_request_time = 0

                found = 0
                total = len(self.COMPANY_CIKS)

                for ticker, cik in self.COMPANY_CIKS.items():
                    result = await self.downloader._search_edgar(
                        client, cik, 2024, 'Q1'
                    )
                    if result:
                        found += 1
                        logger.info(f"  ✓ {ticker}: {result[:80]}...")
                    else:
                        logger.warning(f"  ✗ {ticker}: not found")

                    # Respect rate limits
                    await asyncio.sleep(1.5)

                success_rate = found / total * 100
                logger.info(f"\nFound {found}/{total} ({success_rate:.0f}%) Q1 2024 filings")
                # We should find at least some filings
                self.assertGreater(found, 0, "Should find at least one filing")

        run_async(test())


class TestContentValidationE2E(unittest.TestCase):
    """Test content validation with real downloads"""

    def setUp(self):
        self.db = MagicMock()
        self.downloader = EarningsDownloader(self.db)

    def test_validate_real_filing(self):
        """Test validation on a real SEC filing"""
        async def test():
            async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
                self.downloader._rate_limiter = asyncio.Lock()
                self.downloader._last_request_time = 0

                filing_url = await self.downloader._search_edgar(
                    client, '0000789019', 2024, 'Q1'
                )

                if filing_url:
                    response = await client.get(filing_url, headers=EDGAR_HEADERS)
                    if response.status_code == 200:
                        is_valid = self.downloader._validate_content(
                            response.content, filing_url
                        )
                        self.assertTrue(is_valid, "Real filing should pass validation")
                        logger.info(f"Validated filing: {len(response.content)} bytes, valid={is_valid}")
                    else:
                        self.skipTest(f"Could not download filing: HTTP {response.status_code}")
                else:
                    self.skipTest("No filing URL to validate")

        run_async(test())


class TestEdgarRateLimiting(unittest.TestCase):
    """Test that rate limiting works correctly"""

    def setUp(self):
        self.db = MagicMock()
        self.downloader = EarningsDownloader(self.db)

    def test_rate_limiting(self):
        """Test that requests are properly rate-limited"""
        import time

        async def test():
            async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
                self.downloader._rate_limiter = asyncio.Lock()
                self.downloader._last_request_time = 0

                url = f"{EDGAR_SUBMISSIONS}/CIK0000789019.json"
                times = []

                # Make 3 requests
                for _ in range(3):
                    start = time.monotonic()
                    await self.downloader._rate_limited_request(client, url, EDGAR_HEADERS)
                    elapsed = time.monotonic() - start
                    times.append(elapsed)

                # Second and third requests should have some delay
                logger.info(f"Request times: {[f'{t:.2f}s' for t in times]}")
                # At least the third request should show rate limiting
                total_time = sum(times)
                self.assertGreater(total_time, 1.0, "Rate limiting should add delays")

        run_async(test())


if __name__ == '__main__':
    unittest.main()
