"""
Enhanced Financial Report Download Engine
Uses SEC EDGAR API + company IR pages for reliable downloads.
Supports concurrent downloads, retry with backoff, and content validation.
"""

import re
import asyncio
import time
import logging
from typing import Optional, List, Dict, Tuple
from datetime import datetime
from dataclasses import dataclass

import httpx
from bs4 import BeautifulSoup

from database import Database

logger = logging.getLogger('finsight-worker.downloader')

# SEC EDGAR base URLs
EDGAR_SUBMISSIONS = "https://data.sec.gov/submissions"
EDGAR_ARCHIVES = "https://www.sec.gov/Archives/edgar/data"

# Required User-Agent for SEC EDGAR (must include email)
EDGAR_HEADERS = {
    "User-Agent": "Finsight Auto Research Tool admin@finsight.auto",
    "Accept-Encoding": "gzip, deflate",
}

HTTP_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/120.0.0.0 Safari/537.36",
}

# Configuration
MAX_CONCURRENT_DOWNLOADS = 3
MAX_RETRIES = 3
RETRY_BASE_DELAY = 2.0  # seconds, exponential backoff
RATE_LIMIT_DELAY = 1.2  # seconds between requests (SEC EDGAR asks for 10 req/s max)
REQUEST_TIMEOUT = 30


@dataclass
class DownloadTask:
    """Represents a single file download task"""
    job_id: int
    company: Dict
    year: int
    quarter: str


class EarningsDownloader:
    """Downloads financial reports using SEC EDGAR API and company IR pages.
    Features: concurrent downloads, retry with exponential backoff, content validation.
    """

    def __init__(self, db: Database):
        self.db = db
        self._semaphore = asyncio.Semaphore(MAX_CONCURRENT_DOWNLOADS)
        self._rate_limiter = asyncio.Lock()
        self._last_request_time = 0.0

    async def _rate_limited_request(
        self, client: httpx.AsyncClient, url: str, headers: dict = None
    ) -> httpx.Response:
        """Make an HTTP request with rate limiting"""
        async with self._rate_limiter:
            now = time.monotonic()
            elapsed = now - self._last_request_time
            if elapsed < RATE_LIMIT_DELAY:
                await asyncio.sleep(RATE_LIMIT_DELAY - elapsed)
            self._last_request_time = time.monotonic()

        response = await client.get(url, headers=headers or HTTP_HEADERS)
        response.raise_for_status()
        return response

    async def process_job(self, job_id: int):
        """Process a complete download job with concurrency and retry"""
        try:
            # Mark job as running
            self.db.update_job_status(
                job_id, 'running',
                started_at=datetime.utcnow().isoformat()
            )

            # Get job details
            job = self.db.get_job(job_id)
            if not job:
                logger.error(f"Job #{job_id} not found")
                return

            years = job['years']
            quarters = job['quarters']

            # Get companies to process
            if job['company_ids']:
                companies = self.db.get_companies(ids=job['company_ids'])
            elif job['category_filter']:
                companies = self.db.get_companies(category=job['category_filter'])
            else:
                companies = self.db.get_all_companies()

            # Calculate total expected files
            total_files = len(companies) * len(years) * len(quarters)
            self.db.update_job_status(job_id, 'running', total_files=total_files)

            logger.info(
                f"Job #{job_id}: {len(companies)} companies x "
                f"{len(years)} years x {len(quarters)} quarters = {total_files} files"
            )

            # Build task list
            tasks: List[DownloadTask] = []
            for company in companies:
                for year in years:
                    for quarter in quarters:
                        tasks.append(DownloadTask(
                            job_id=job_id,
                            company=company,
                            year=year,
                            quarter=quarter,
                        ))

            # Process all tasks with concurrency control
            async with httpx.AsyncClient(
                timeout=REQUEST_TIMEOUT,
                follow_redirects=True,
            ) as client:
                download_coros = [
                    self._download_with_semaphore(client, task)
                    for task in tasks
                ]
                await asyncio.gather(*download_coros, return_exceptions=True)

            # Check final job status
            final_job = self.db.get_job(job_id)
            if final_job and final_job['status'] == 'running':
                self.db.update_job_status(
                    job_id, 'completed',
                    completed_at=datetime.utcnow().isoformat()
                )
                logger.info(f"Job #{job_id} completed successfully")

        except Exception as e:
            logger.error(f"Job #{job_id} failed: {e}")
            self.db.update_job_status(
                job_id, 'failed',
                error_message=str(e),
                completed_at=datetime.utcnow().isoformat()
            )

    async def _download_with_semaphore(
        self, client: httpx.AsyncClient, task: DownloadTask
    ):
        """Download with concurrency limit"""
        async with self._semaphore:
            await self._download_filing_with_retry(client, task)

    async def _download_filing_with_retry(
        self, client: httpx.AsyncClient, task: DownloadTask
    ):
        """Download a single filing with retry logic"""
        company = task.company
        ticker = company['ticker']
        log_id = self.db.create_download_log(
            task.job_id, company['id'], task.year, task.quarter
        )

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                self.db.update_download_log(log_id, status='downloading')
                start_time = time.time()

                # Try SEC EDGAR first for US-listed companies with CIK
                sec_cik = company.get('sec_cik', '')
                filing_url = None
                if sec_cik:
                    filing_url = await self._search_edgar(client, sec_cik, task.year, task.quarter)

                # Fallback to IR page scraping
                if not filing_url and company.get('ir_url'):
                    filing_url = await self._search_ir_page(
                        client, company['ir_url'], ticker, task.year, task.quarter
                    )

                if not filing_url:
                    # No filing found - not a retriable error
                    self.db.update_download_log(
                        log_id,
                        status='failed',
                        error_message=f'No filing found for {ticker} {task.year} {task.quarter}'
                    )
                    self.db.increment_job_counter(task.job_id, 'failed_files')
                    logger.warning(f"No filing found: {ticker} {task.year} {task.quarter}")
                    return

                # Download the file
                headers = EDGAR_HEADERS if 'sec.gov' in filing_url else HTTP_HEADERS
                response = await self._rate_limited_request(client, filing_url, headers)

                content = response.content
                file_size = len(content)

                # Validate content - ensure it's not an HTML error page
                if not self._validate_content(content, filing_url):
                    raise ValueError("Downloaded content appears to be HTML error page, not a valid document")

                filename = f"{task.year}_{task.quarter}_{ticker}"
                # Determine extension from URL or content type
                content_type = response.headers.get('content-type', '')
                if 'pdf' in content_type or filing_url.lower().endswith('.pdf'):
                    filename += '.pdf'
                elif 'html' in content_type or filing_url.lower().endswith('.htm'):
                    filename += '.htm'
                else:
                    filename += '.pdf'

                duration_ms = int((time.time() - start_time) * 1000)

                self.db.update_download_log(
                    log_id,
                    status='success',
                    filename=filename,
                    file_url=filing_url,
                    file_size=file_size,
                    download_duration_ms=duration_ms,
                )
                self.db.increment_job_counter(task.job_id, 'completed_files')
                logger.info(f"Downloaded: {filename} ({file_size / 1024:.1f} KB) [attempt {attempt}]")
                return  # Success

            except Exception as e:
                logger.warning(
                    f"Attempt {attempt}/{MAX_RETRIES} failed for "
                    f"{ticker} {task.year} {task.quarter}: {e}"
                )
                if attempt < MAX_RETRIES:
                    delay = RETRY_BASE_DELAY * (2 ** (attempt - 1))
                    logger.info(f"Retrying in {delay:.1f}s...")
                    await asyncio.sleep(delay)
                else:
                    # All retries exhausted
                    self.db.update_download_log(
                        log_id,
                        status='failed',
                        error_message=f'Failed after {MAX_RETRIES} attempts: {str(e)}'
                    )
                    self.db.increment_job_counter(task.job_id, 'failed_files')
                    logger.error(
                        f"Download failed permanently for "
                        f"{ticker} {task.year} {task.quarter}: {e}"
                    )

    def _validate_content(self, content: bytes, url: str) -> bool:
        """Validate that downloaded content is a real document, not an error page"""
        if len(content) < 500:
            return False  # Too small to be a real filing

        # Check for PDF magic bytes
        if content[:4] == b'%PDF':
            return True

        # If URL suggests it should be a PDF but content is HTML, reject
        if url.lower().endswith('.pdf') and content[:5] != b'%PDF-':
            return False

        # For HTML filings (10-K/10-Q), check it's not a generic error
        text_start = content[:2000].decode('utf-8', errors='ignore').lower()
        error_indicators = ['page not found', '404', 'access denied', 'forbidden', 'error']
        if any(indicator in text_start for indicator in error_indicators):
            if '<html' in text_start:
                return False

        return True

    async def _search_edgar(
        self, client: httpx.AsyncClient, cik: str, year: int, quarter: str
    ) -> Optional[str]:
        """Search SEC EDGAR for a filing.
        Supports:
        - 10-Q / 10-K for domestic filers
        - 20-F (annual) / 6-K (quarterly) for foreign private issuers
        - Non-standard fiscal year ends (e.g. MSFT June, AAPL September)
        """
        if not cik:
            return None

        try:
            # Get company submissions from EDGAR
            cik_padded = cik.lstrip('0').zfill(10)
            url = f"{EDGAR_SUBMISSIONS}/CIK{cik_padded}.json"

            response = await self._rate_limited_request(client, url, EDGAR_HEADERS)
            data = response.json()

            recent = data.get('filings', {}).get('recent', {})
            forms = recent.get('form', [])
            dates = recent.get('filingDate', [])
            accessions = recent.get('accessionNumber', [])
            primary_docs = recent.get('primaryDocument', [])
            periods = recent.get('reportDate', [])

            # Determine which form types to look for
            if quarter == "FY":
                target_forms = {'10-K', '20-F'}  # 20-F for foreign issuers
            else:
                target_forms = {'10-Q', '6-K'}    # 6-K for foreign issuers

            # First pass: collect all candidate filings
            candidates = []
            for i, form in enumerate(forms):
                if form not in target_forms:
                    continue

                filing_date = dates[i] if i < len(dates) else ''
                period_date = periods[i] if i < len(periods) else filing_date

                if not filing_date:
                    continue
                if i >= len(accessions) or i >= len(primary_docs):
                    continue

                period_year = int(period_date[:4]) if period_date and len(period_date) >= 4 else 0
                period_month = int(period_date[5:7]) if period_date and len(period_date) >= 7 else 0
                filing_year = int(filing_date[:4]) if filing_date else 0

                candidates.append({
                    'index': i,
                    'form': form,
                    'filing_date': filing_date,
                    'period_date': period_date,
                    'period_year': period_year,
                    'period_month': period_month,
                    'filing_year': filing_year,
                })

            # Second pass: match by year and quarter
            # For annual reports (FY), match by period year
            if quarter == "FY":
                for c in candidates:
                    # Period year should match (report covers this fiscal year)
                    py = c['period_year']
                    if py == year or (py == year + 1 and c['period_month'] <= 3):
                        return self._build_filing_url(cik, accessions[c['index']], primary_docs[c['index']])

            else:
                # For quarterly, use flexible quarter matching
                quarter_num = int(quarter[1])

                # Map calendar quarter to period end months (flexible for fiscal year offsets)
                # A Q1 report could end in any month depending on fiscal year start
                # We match based on the ordinal position of the 10-Q filing in the year
                quarter_period_months = {
                    1: {1, 2, 3, 4},      # Q1 period ends Jan-Apr
                    2: {4, 5, 6, 7},      # Q2 period ends Apr-Jul
                    3: {7, 8, 9, 10},     # Q3 period ends Jul-Oct
                    4: {10, 11, 12, 1},   # Q4 period ends Oct-Jan
                }

                # Collect yearly 10-Qs for the target year
                year_filings = []
                for c in candidates:
                    py = c['period_year']
                    fy = c['filing_year']
                    # Filing should be within ~1 year of target
                    if abs(py - year) <= 1 or abs(fy - year) <= 1:
                        year_filings.append(c)

                # Strategy 1: Match by period end month
                for c in year_filings:
                    pm = c['period_month']
                    py = c['period_year']
                    if pm in quarter_period_months.get(quarter_num, set()):
                        # Year should be close
                        if py == year or (quarter_num == 4 and py == year + 1 and pm <= 3):
                            return self._build_filing_url(cik, accessions[c['index']], primary_docs[c['index']])

                # Strategy 2: For 6-K filings (foreign issuers), be more lenient
                # 6-K is used for many purposes; just match by year + approximate quarter
                for c in year_filings:
                    if c['form'] == '6-K':
                        pm = c['period_month']
                        py = c['period_year']
                        if py == year and pm in quarter_period_months.get(quarter_num, set()):
                            return self._build_filing_url(cik, accessions[c['index']], primary_docs[c['index']])

                # Strategy 3: If no period match, try by ordinal position
                # Sort this year's quarterly filings by period date and pick the Nth
                year_quarterlies = sorted(
                    [c for c in year_filings if c['period_year'] == year],
                    key=lambda x: x['period_date']
                )
                if quarter_num <= len(year_quarterlies):
                    c = year_quarterlies[quarter_num - 1]
                    return self._build_filing_url(cik, accessions[c['index']], primary_docs[c['index']])

            return None

        except Exception as e:
            logger.debug(f"EDGAR search failed for CIK {cik}: {e}")
            return None

    def _build_filing_url(self, cik: str, accession: str, primary_doc: str) -> str:
        """Build a filing URL from accession number and primary document"""
        accession_clean = accession.replace('-', '')
        cik_num = cik.lstrip('0')
        return f"{EDGAR_ARCHIVES}/{cik_num}/{accession_clean}/{primary_doc}"

    async def _search_ir_page(
        self, client: httpx.AsyncClient, ir_url: str, ticker: str,
        year: int, quarter: str
    ) -> Optional[str]:
        """Search company IR page for filing links"""
        try:
            response = await self._rate_limited_request(client, ir_url, HTTP_HEADERS)
            soup = BeautifulSoup(response.text, 'lxml')
            links = soup.find_all('a', href=True)

            candidates: List[Tuple[str, int]] = []  # (url, score)

            for link in links:
                href = link.get('href', '')
                text = link.get_text(strip=True).upper()
                combined = f"{text} {href}".upper()

                # Check if it's a financial document
                financial_keywords = [
                    'EARNINGS', 'FINANCIAL', 'QUARTERLY', 'ANNUAL',
                    '10-Q', '10-K', 'RESULTS', 'PRESS RELEASE',
                    'SEC FILING', 'REPORT'
                ]
                is_financial = any(kw in combined for kw in financial_keywords)

                if not is_financial:
                    continue

                # Check year match
                if str(year) not in combined:
                    # Also check 2-digit fiscal year notation (e.g., FY24)
                    fy_short = str(year)[-2:]
                    if f'FY{fy_short}' not in combined and f"FY'{fy_short}" not in combined:
                        continue

                # Check quarter match
                quarter_patterns = {
                    'Q1': [r'\bQ1\b', r'FIRST\s+QUARTER', r'\b1Q\b', r'Q1\s*FY'],
                    'Q2': [r'\bQ2\b', r'SECOND\s+QUARTER', r'\b2Q\b', r'Q2\s*FY'],
                    'Q3': [r'\bQ3\b', r'THIRD\s+QUARTER', r'\b3Q\b', r'Q3\s*FY'],
                    'Q4': [r'\bQ4\b', r'FOURTH\s+QUARTER', r'\b4Q\b', r'Q4\s*FY'],
                    'FY': [r'\bFY\b', r'ANNUAL', r'YEAR[\s-]*END', r'\b10-?K\b', r'FULL\s+YEAR'],
                }

                quarter_match = any(
                    re.search(pattern, combined)
                    for pattern in quarter_patterns.get(quarter, [])
                )

                if not quarter_match:
                    continue

                # Score the match
                score = 0
                if href.lower().endswith('.pdf'):
                    score += 10  # Prefer PDFs
                if 'EARNINGS' in combined:
                    score += 5
                if '10-Q' in combined or '10-K' in combined:
                    score += 8
                if ticker.upper() in combined:
                    score += 3

                # Make URL absolute
                abs_href = href
                if not href.startswith('http'):
                    from urllib.parse import urljoin
                    abs_href = urljoin(ir_url, href)

                candidates.append((abs_href, score))

            if candidates:
                # Return the highest-scored candidate
                candidates.sort(key=lambda x: x[1], reverse=True)
                return candidates[0][0]

            return None

        except Exception as e:
            logger.debug(f"IR page search failed for {ticker}: {e}")
            return None
