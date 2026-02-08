"""
Full coverage verification: Test ALL 24 companies × multiple years × quarters.
Validates SEC EDGAR search, IR page fallback, filing URL accessibility, and content validity.

Run with: python -m pytest tests/test_full_coverage.py -v -s
"""

import asyncio
import time
import logging
import unittest
from unittest.mock import MagicMock
from collections import defaultdict

import httpx
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from downloader import EarningsDownloader, EDGAR_HEADERS, HTTP_HEADERS

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)


# ============================================================
# All 24 companies with their SEC CIK codes
# ============================================================
ALL_COMPANIES = [
    # AI Applications (10)
    {'name': 'Microsoft',   'ticker': 'MSFT',  'sec_cik': '0000789019', 'category': 'AI_Applications', 'ir_url': 'https://www.microsoft.com/en-us/investor/earnings/'},
    {'name': 'Alphabet',    'ticker': 'GOOGL', 'sec_cik': '0001652044', 'category': 'AI_Applications', 'ir_url': 'https://abc.xyz/investor/'},
    {'name': 'Amazon',      'ticker': 'AMZN',  'sec_cik': '0001018724', 'category': 'AI_Applications', 'ir_url': 'https://ir.aboutamazon.com/quarterly-results/'},
    {'name': 'Meta',        'ticker': 'META',  'sec_cik': '0001326801', 'category': 'AI_Applications', 'ir_url': 'https://investor.fb.com/financials/'},
    {'name': 'Salesforce',  'ticker': 'CRM',   'sec_cik': '0001108524', 'category': 'AI_Applications', 'ir_url': 'https://investor.salesforce.com/financials/'},
    {'name': 'ServiceNow',  'ticker': 'NOW',   'sec_cik': '0001373715', 'category': 'AI_Applications', 'ir_url': 'https://investors.servicenow.com/financials/'},
    {'name': 'Palantir',    'ticker': 'PLTR',  'sec_cik': '0001321655', 'category': 'AI_Applications', 'ir_url': 'https://investors.palantir.com/financials/'},
    {'name': 'Apple',       'ticker': 'AAPL',  'sec_cik': '0000320193', 'category': 'AI_Applications', 'ir_url': 'https://investor.apple.com/investor-relations/'},
    {'name': 'AppLovin',    'ticker': 'APP',   'sec_cik': '0001751008', 'category': 'AI_Applications', 'ir_url': 'https://investors.applovin.com/financials/'},
    {'name': 'Adobe',       'ticker': 'ADBE',  'sec_cik': '0000796343', 'category': 'AI_Applications', 'ir_url': 'https://www.adobe.com/investor-relations/earnings.html'},

    # AI Supply Chain (14)
    {'name': 'Nvidia',      'ticker': 'NVDA',  'sec_cik': '0001045810', 'category': 'AI_Supply_Chain', 'ir_url': 'https://investor.nvidia.com/financial-info/'},
    {'name': 'AMD',         'ticker': 'AMD',   'sec_cik': '0000002488', 'category': 'AI_Supply_Chain', 'ir_url': 'https://ir.amd.com/financial-information/'},
    {'name': 'Broadcom',    'ticker': 'AVGO',  'sec_cik': '0001730168', 'category': 'AI_Supply_Chain', 'ir_url': 'https://investors.broadcom.com/financials/'},
    {'name': 'TSMC',        'ticker': 'TSM',   'sec_cik': '0001046179', 'category': 'AI_Supply_Chain', 'ir_url': 'https://investor.tsmc.com/english/quarterly-results'},
    {'name': 'SK Hynix',    'ticker': 'SKH',   'sec_cik': '',           'category': 'AI_Supply_Chain', 'ir_url': 'https://www.skhynix.com/eng/ir/earnings.do'},
    {'name': 'Micron',      'ticker': 'MU',    'sec_cik': '0000723125', 'category': 'AI_Supply_Chain', 'ir_url': 'https://investors.micron.com/financials/'},
    {'name': 'Samsung',     'ticker': 'SSNLF', 'sec_cik': '',           'category': 'AI_Supply_Chain', 'ir_url': 'https://www.samsung.com/global/ir/reports-disclosures/financial-information/'},
    {'name': 'Intel',       'ticker': 'INTC',  'sec_cik': '0000050863', 'category': 'AI_Supply_Chain', 'ir_url': 'https://www.intc.com/financial-info/'},
    {'name': 'Vertiv',      'ticker': 'VRT',   'sec_cik': '0001674101', 'category': 'AI_Supply_Chain', 'ir_url': 'https://investors.vertiv.com/financials/'},
    {'name': 'Eaton',       'ticker': 'ETN',   'sec_cik': '0001551182', 'category': 'AI_Supply_Chain', 'ir_url': 'https://www.eaton.com/us/en-us/company/investors/financial-results.html'},
    {'name': 'GE Vernova',  'ticker': 'GEV',   'sec_cik': '0001996810', 'category': 'AI_Supply_Chain', 'ir_url': 'https://www.gevernova.com/investors/financial-information'},
    {'name': 'Vistra',      'ticker': 'VST',   'sec_cik': '0001692819', 'category': 'AI_Supply_Chain', 'ir_url': 'https://investors.vistracorp.com/financials/'},
    {'name': 'ASML',        'ticker': 'ASML',  'sec_cik': '0000937966', 'category': 'AI_Supply_Chain', 'ir_url': 'https://www.asml.com/en/investors/financial-results'},
    {'name': 'Synopsys',    'ticker': 'SNPS',  'sec_cik': '0000883241', 'category': 'AI_Supply_Chain', 'ir_url': 'https://investor.synopsys.com/financials/'},
]


def run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


class TestAllCompaniesEdgarAccess(unittest.TestCase):
    """Verify SEC EDGAR API access for every company with a CIK"""

    def setUp(self):
        self.db = MagicMock()
        self.downloader = EarningsDownloader(self.db)

    def test_all_companies_edgar_reachable(self):
        """Verify that EDGAR submissions endpoint returns data for every company with CIK"""
        companies_with_cik = [c for c in ALL_COMPANIES if c['sec_cik']]
        logger.info(f"\n{'='*70}")
        logger.info(f"Testing SEC EDGAR access for {len(companies_with_cik)} companies with CIK")
        logger.info(f"(2 companies without CIK: SK Hynix, Samsung - Korean listings)")
        logger.info(f"{'='*70}\n")

        async def test():
            async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
                success = 0
                failed = []

                for company in companies_with_cik:
                    ticker = company['ticker']
                    cik = company['sec_cik']
                    cik_padded = cik.lstrip('0').zfill(10)
                    url = f"https://data.sec.gov/submissions/CIK{cik_padded}.json"

                    try:
                        response = await client.get(url, headers=EDGAR_HEADERS)
                        if response.status_code == 200:
                            data = response.json()
                            filings_count = len(data.get('filings', {}).get('recent', {}).get('form', []))
                            logger.info(f"  ✓ {ticker:6s} ({company['name']:12s}) - {filings_count} filings")
                            success += 1
                        else:
                            logger.warning(f"  ✗ {ticker:6s} ({company['name']:12s}) - HTTP {response.status_code}")
                            failed.append(ticker)
                    except Exception as e:
                        logger.error(f"  ✗ {ticker:6s} ({company['name']:12s}) - Error: {e}")
                        failed.append(ticker)

                    await asyncio.sleep(0.5)  # Rate limit

                logger.info(f"\n{'─'*70}")
                logger.info(f"EDGAR access: {success}/{len(companies_with_cik)} companies OK")
                if failed:
                    logger.info(f"Failed: {', '.join(failed)}")
                logger.info(f"{'─'*70}\n")

                self.assertEqual(len(failed), 0, f"EDGAR access failed for: {', '.join(failed)}")

        run_async(test())


class TestQuarterlySearchAllCompanies(unittest.TestCase):
    """Test searching quarterly filings for all 24 companies"""

    def setUp(self):
        self.db = MagicMock()
        self.downloader = EarningsDownloader(self.db)

    def test_2024_q1_all_companies(self):
        """Search 2024 Q1 filings for all companies with CIK"""
        self._run_quarter_search(2024, 'Q1')

    def test_2024_q2_all_companies(self):
        """Search 2024 Q2 filings for all companies with CIK"""
        self._run_quarter_search(2024, 'Q2')

    def test_2024_q3_all_companies(self):
        """Search 2024 Q3 filings for all companies with CIK"""
        self._run_quarter_search(2024, 'Q3')

    def test_2023_fy_all_companies(self):
        """Search 2023 FY (10-K) filings for all companies with CIK"""
        self._run_quarter_search(2023, 'FY')

    def _run_quarter_search(self, year: int, quarter: str):
        companies_with_cik = [c for c in ALL_COMPANIES if c['sec_cik']]
        form_type = "10-K" if quarter == "FY" else "10-Q"

        logger.info(f"\n{'='*70}")
        logger.info(f"Searching {year} {quarter} ({form_type}) for {len(companies_with_cik)} companies")
        logger.info(f"{'='*70}\n")

        async def test():
            async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
                self.downloader._rate_limiter = asyncio.Lock()
                self.downloader._last_request_time = 0

                found = 0
                not_found = []
                results = {}

                for company in companies_with_cik:
                    ticker = company['ticker']
                    cik = company['sec_cik']

                    url = await self.downloader._search_edgar(client, cik, year, quarter)

                    if url:
                        found += 1
                        results[ticker] = url
                        logger.info(f"  ✓ {ticker:6s} - {url[:80]}...")
                    else:
                        not_found.append(ticker)
                        logger.info(f"  ✗ {ticker:6s} - not found")

                    await asyncio.sleep(0.3)

                total = len(companies_with_cik)
                pct = found / total * 100 if total > 0 else 0
                logger.info(f"\n{'─'*70}")
                logger.info(f"{year} {quarter}: Found {found}/{total} ({pct:.0f}%)")
                if not_found:
                    logger.info(f"  Not found: {', '.join(not_found)}")
                    logger.info(f"  (This may be normal - fiscal year offsets, not yet filed, etc.)")
                logger.info(f"{'─'*70}\n")

                # We should find a majority of filings
                self.assertGreaterEqual(
                    pct, 50,
                    f"Expected to find >=50% of {year} {quarter} filings, got {pct:.0f}%"
                )

        run_async(test())


class TestMultiYearSearch(unittest.TestCase):
    """Test year-range search across 2022-2024"""

    def setUp(self):
        self.db = MagicMock()
        self.downloader = EarningsDownloader(self.db)

    def test_multi_year_single_company(self):
        """Test searching MSFT filings across 2022-2024, all quarters"""
        cik = '0000789019'
        years = [2022, 2023, 2024]
        quarters = ['Q1', 'Q2', 'Q3', 'FY']

        logger.info(f"\n{'='*70}")
        logger.info(f"Testing MSFT multi-year search: {years} × {quarters}")
        logger.info(f"{'='*70}\n")

        async def test():
            async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
                self.downloader._rate_limiter = asyncio.Lock()
                self.downloader._last_request_time = 0

                found = 0
                total = 0
                results = {}

                for year in years:
                    for quarter in quarters:
                        total += 1
                        url = await self.downloader._search_edgar(client, cik, year, quarter)

                        label = f"{year} {quarter}"
                        if url:
                            found += 1
                            results[label] = url
                            logger.info(f"  ✓ MSFT {label} - {url[:70]}...")
                        else:
                            logger.info(f"  ✗ MSFT {label} - not found")

                        await asyncio.sleep(0.3)

                pct = found / total * 100
                logger.info(f"\n{'─'*70}")
                logger.info(f"MSFT multi-year: {found}/{total} ({pct:.0f}%) filings found")
                logger.info(f"{'─'*70}\n")

                # MSFT should have most filings available
                self.assertGreaterEqual(found, 8, f"Expected at least 8 MSFT filings, got {found}")

        run_async(test())

    def test_multi_year_nvda(self):
        """Test searching NVDA filings across 2022-2024"""
        cik = '0001045810'
        years = [2022, 2023, 2024]
        quarters = ['Q1', 'Q2', 'Q3', 'FY']

        logger.info(f"\n{'='*70}")
        logger.info(f"Testing NVDA multi-year search: {years} × {quarters}")
        logger.info(f"{'='*70}\n")

        async def test():
            async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
                self.downloader._rate_limiter = asyncio.Lock()
                self.downloader._last_request_time = 0

                found = 0
                total = 0

                for year in years:
                    for quarter in quarters:
                        total += 1
                        url = await self.downloader._search_edgar(client, cik, year, quarter)
                        label = f"{year} {quarter}"
                        if url:
                            found += 1
                            logger.info(f"  ✓ NVDA {label}")
                        else:
                            logger.info(f"  ✗ NVDA {label}")
                        await asyncio.sleep(0.3)

                pct = found / total * 100
                logger.info(f"\n  NVDA multi-year: {found}/{total} ({pct:.0f}%)\n")
                self.assertGreaterEqual(found, 6, f"Expected at least 6 NVDA filings, got {found}")

        run_async(test())


class TestFilingDownloadVerification(unittest.TestCase):
    """Verify that found filing URLs actually return valid content"""

    def setUp(self):
        self.db = MagicMock()
        self.downloader = EarningsDownloader(self.db)

    def test_download_and_validate_filings(self):
        """Download and validate actual filing content for 5 companies"""
        test_companies = [
            {'ticker': 'MSFT',  'cik': '0000789019'},
            {'ticker': 'AAPL',  'cik': '0000320193'},
            {'ticker': 'NVDA',  'cik': '0001045810'},
            {'ticker': 'META',  'cik': '0001326801'},
            {'ticker': 'AMZN',  'cik': '0001018724'},
        ]

        logger.info(f"\n{'='*70}")
        logger.info(f"Download & validate filings for {len(test_companies)} companies")
        logger.info(f"{'='*70}\n")

        async def test():
            async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
                self.downloader._rate_limiter = asyncio.Lock()
                self.downloader._last_request_time = 0

                valid = 0
                invalid = 0

                for company in test_companies:
                    ticker = company['ticker']
                    url = await self.downloader._search_edgar(
                        client, company['cik'], 2024, 'Q1'
                    )
                    if not url:
                        logger.info(f"  ⊘ {ticker} - no filing URL found, skipping")
                        continue

                    try:
                        response = await client.get(url, headers=EDGAR_HEADERS)
                        content = response.content
                        size = len(content)
                        is_valid = self.downloader._validate_content(content, url)

                        content_type = response.headers.get('content-type', 'unknown')
                        is_pdf = content[:4] == b'%PDF'

                        if is_valid:
                            valid += 1
                            logger.info(
                                f"  ✓ {ticker} - {size/1024:.1f} KB, "
                                f"{'PDF' if is_pdf else 'HTML'}, "
                                f"HTTP {response.status_code}"
                            )
                        else:
                            invalid += 1
                            logger.warning(
                                f"  ✗ {ticker} - validation failed, "
                                f"{size} bytes, type={content_type}"
                            )
                    except Exception as e:
                        invalid += 1
                        logger.error(f"  ✗ {ticker} - download error: {e}")

                    await asyncio.sleep(1.0)

                logger.info(f"\n{'─'*70}")
                logger.info(f"Download validation: {valid} valid, {invalid} invalid")
                logger.info(f"{'─'*70}\n")

                self.assertGreater(valid, 0, "Should have at least 1 valid download")
                self.assertEqual(invalid, 0, "Should have no invalid downloads")

        run_async(test())


class TestNonUSCompanyFallback(unittest.TestCase):
    """Test that companies without CIK (SK Hynix, Samsung) are handled gracefully"""

    def setUp(self):
        self.db = MagicMock()
        self.downloader = EarningsDownloader(self.db)

    def test_no_cik_companies_identified(self):
        """Verify we correctly identify companies without CIK"""
        no_cik = [c for c in ALL_COMPANIES if not c['sec_cik']]
        logger.info(f"\nCompanies without SEC CIK (non-US listings):")
        for c in no_cik:
            logger.info(f"  - {c['name']} ({c['ticker']}) - will use IR page fallback")

        self.assertEqual(len(no_cik), 2)
        tickers = {c['ticker'] for c in no_cik}
        self.assertIn('SKH', tickers)
        self.assertIn('SSNLF', tickers)

    def test_empty_cik_returns_none(self):
        """Verify that empty CIK does not cause errors"""
        async def test():
            async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
                self.downloader._rate_limiter = asyncio.Lock()
                self.downloader._last_request_time = 0

                result = await self.downloader._search_edgar(client, '', 2024, 'Q1')
                self.assertIsNone(result)

        run_async(test())


if __name__ == '__main__':
    unittest.main()
