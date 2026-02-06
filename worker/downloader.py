"""
Enhanced Financial Report Download Engine
Uses SEC EDGAR API + company IR pages for reliable downloads
"""

import re
import time
import logging
from typing import Optional, Tuple, List, Dict
from datetime import datetime
from pathlib import Path

import httpx
from bs4 import BeautifulSoup

from database import Database

logger = logging.getLogger('finsight-worker.downloader')

# SEC EDGAR base URL
EDGAR_BASE = "https://efts.sec.gov/LATEST/search-index"
EDGAR_SUBMISSIONS = "https://data.sec.gov/submissions"
EDGAR_ARCHIVES = "https://www.sec.gov/Archives/edgar/data"

# Required User-Agent for SEC EDGAR
EDGAR_HEADERS = {
    "User-Agent": "Finsight Auto Research Tool admin@finsight.auto",
    "Accept-Encoding": "gzip, deflate",
}

HTTP_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}


class EarningsDownloader:
    """Downloads financial reports using SEC EDGAR API and company IR pages"""

    def __init__(self, db: Database):
        self.db = db
        self.client = httpx.AsyncClient(timeout=30, follow_redirects=True)

    async def process_job(self, job_id: int):
        """Process a complete download job"""
        try:
            # Mark job as running
            await self.db.update_job_status(
                job_id, 'running',
                started_at=datetime.utcnow().isoformat()
            )

            # Get job details
            job = await self.db.get_job(job_id)
            if not job:
                logger.error(f"Job #{job_id} not found")
                return

            years = job['years']
            quarters = job['quarters']

            # Get companies to process
            if job['company_ids']:
                companies = await self.db.get_companies(ids=job['company_ids'])
            elif job['category_filter']:
                companies = await self.db.get_companies(category=job['category_filter'])
            else:
                companies = await self.db.get_all_companies()

            # Calculate total expected files
            total_files = len(companies) * len(years) * len(quarters)
            await self.db.update_job_status(job_id, 'running', total_files=total_files)

            logger.info(f"Job #{job_id}: {len(companies)} companies x {len(years)} years x {len(quarters)} quarters = {total_files} files")

            # Process each company
            for company in companies:
                for year in years:
                    for quarter in quarters:
                        try:
                            await self._download_filing(
                                job_id=job_id,
                                company=company,
                                year=year,
                                quarter=quarter,
                            )
                        except Exception as e:
                            logger.error(f"Error downloading {company['ticker']} {year} {quarter}: {e}")

                        # Rate limiting
                        time.sleep(1.5)

            # Mark job as completed
            await self.db.update_job_status(
                job_id, 'completed',
                completed_at=datetime.utcnow().isoformat()
            )

        except Exception as e:
            logger.error(f"Job #{job_id} failed: {e}")
            await self.db.update_job_status(
                job_id, 'failed',
                error_message=str(e),
                completed_at=datetime.utcnow().isoformat()
            )

    async def _download_filing(
        self, job_id: int, company: Dict, year: int, quarter: str
    ):
        """Download a single filing for a company/year/quarter"""
        company_id = company['id']
        ticker = company['ticker']
        sec_cik = company.get('sec_cik', '')

        # Create log entry
        log_id = await self.db.create_download_log(job_id, company_id, year, quarter)

        try:
            start_time = time.time()
            await self.db.update_download_log(log_id, status='downloading')

            # Try SEC EDGAR first for US-listed companies with CIK
            filing_url = None
            if sec_cik:
                filing_url = await self._search_edgar(sec_cik, year, quarter)

            # Fallback to IR page scraping
            if not filing_url and company.get('ir_url'):
                filing_url = await self._search_ir_page(
                    company['ir_url'], ticker, year, quarter
                )

            if not filing_url:
                await self.db.update_download_log(
                    log_id,
                    status='failed',
                    error_message=f'No filing found for {ticker} {year} {quarter}'
                )
                await self.db.increment_job_counter(job_id, 'failed_files')
                logger.warning(f"No filing found: {ticker} {year} {quarter}")
                return

            # Download the file
            response = await self.client.get(
                filing_url,
                headers=EDGAR_HEADERS if 'sec.gov' in filing_url else HTTP_HEADERS
            )
            response.raise_for_status()

            file_size = len(response.content)
            filename = f"{year}_{quarter}_{ticker}.pdf"
            duration_ms = int((time.time() - start_time) * 1000)

            await self.db.update_download_log(
                log_id,
                status='success',
                filename=filename,
                file_url=filing_url,
                file_size=file_size,
                download_duration_ms=duration_ms,
            )
            await self.db.increment_job_counter(job_id, 'completed_files')
            logger.info(f"Downloaded: {filename} ({file_size / 1024:.1f} KB)")

        except Exception as e:
            await self.db.update_download_log(
                log_id,
                status='failed',
                error_message=str(e)
            )
            await self.db.increment_job_counter(job_id, 'failed_files')
            logger.error(f"Download failed for {ticker} {year} {quarter}: {e}")

    async def _search_edgar(self, cik: str, year: int, quarter: str) -> Optional[str]:
        """Search SEC EDGAR for a filing"""
        try:
            # Map quarter to form type and date range
            form_type = "10-K" if quarter == "FY" else "10-Q"

            # Get company submissions from EDGAR
            cik_padded = cik.lstrip('0').zfill(10)
            url = f"{EDGAR_SUBMISSIONS}/CIK{cik_padded}.json"

            response = await self.client.get(url, headers=EDGAR_HEADERS)
            response.raise_for_status()

            data = response.json()
            recent = data.get('filings', {}).get('recent', {})

            forms = recent.get('form', [])
            dates = recent.get('filingDate', [])
            accessions = recent.get('accessionNumber', [])
            primary_docs = recent.get('primaryDocument', [])

            # Find matching filing
            for i, form in enumerate(forms):
                if form != form_type:
                    continue

                filing_date = dates[i]
                filing_year = int(filing_date[:4])

                # Match by year (with some flexibility for fiscal year offsets)
                if abs(filing_year - year) > 1:
                    continue

                # For quarterly reports, check the period
                if quarter != "FY":
                    quarter_num = int(quarter[1])
                    filing_month = int(filing_date[5:7])
                    expected_months = {1: [4, 5], 2: [7, 8], 3: [10, 11], 4: [1, 2, 3]}
                    if filing_month not in expected_months.get(quarter_num, []):
                        continue

                # Build filing URL
                accession = accessions[i].replace('-', '')
                primary_doc = primary_docs[i]
                cik_num = cik.lstrip('0')
                filing_url = f"{EDGAR_ARCHIVES}/{cik_num}/{accession}/{primary_doc}"

                return filing_url

            return None

        except Exception as e:
            logger.debug(f"EDGAR search failed for CIK {cik}: {e}")
            return None

    async def _search_ir_page(
        self, ir_url: str, ticker: str, year: int, quarter: str
    ) -> Optional[str]:
        """Search company IR page for filing links"""
        try:
            response = await self.client.get(ir_url, headers=HTTP_HEADERS)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, 'lxml')
            links = soup.find_all('a', href=True)

            for link in links:
                href = link.get('href', '')
                text = link.get_text(strip=True).upper()
                combined = f"{text} {href}".upper()

                # Check if it's a financial document
                is_financial = any(kw in combined for kw in [
                    'EARNINGS', 'FINANCIAL', 'QUARTERLY', 'ANNUAL',
                    '10-Q', '10-K', 'RESULTS', 'PRESS RELEASE'
                ])

                if not is_financial:
                    continue

                # Check year and quarter match
                if str(year) not in combined:
                    continue

                quarter_patterns = {
                    'Q1': [r'\bQ1\b', r'FIRST\s+QUARTER', r'\b1Q\b'],
                    'Q2': [r'\bQ2\b', r'SECOND\s+QUARTER', r'\b2Q\b'],
                    'Q3': [r'\bQ3\b', r'THIRD\s+QUARTER', r'\b3Q\b'],
                    'Q4': [r'\bQ4\b', r'FOURTH\s+QUARTER', r'\b4Q\b'],
                    'FY': [r'\bFY\b', r'ANNUAL', r'YEAR\s+END', r'\b10-?K\b'],
                }

                quarter_match = any(
                    re.search(pattern, combined)
                    for pattern in quarter_patterns.get(quarter, [])
                )

                if quarter_match and href.lower().endswith('.pdf'):
                    # Make URL absolute
                    if not href.startswith('http'):
                        from urllib.parse import urljoin
                        href = urljoin(ir_url, href)
                    return href

            return None

        except Exception as e:
            logger.debug(f"IR page search failed for {ticker}: {e}")
            return None
