import re
import logging
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from datetime import datetime
from decimal import Decimal
from typing import List, Dict, Any, Optional
from scrapers.base import BaseScraper

logger = logging.getLogger(__name__)

class CPPPScraper(BaseScraper):
    def __init__(self, use_proxy: bool = False, proxies: Optional[Dict[str, str]] = None):
        super().__init__(use_proxy, proxies)
        self.base_url_candidates = [
            "https://eprocure.gov.in/cppp/latestactivetendersnew",
            "https://eprocure.gov.in/cppp/latestactivetenders",
            "https://eprocure.gov.in/cppp/latestactivecorrigendumsnew",
            "https://eprocure.gov.in/cppp/tendersclosingbydays/bytoday",
            "https://eprocure.gov.in/cppp/"
        ]
        self.base_url = self.resolve_base_url()

    def resolve_base_url(self) -> str:
        for url in self.base_url_candidates:
            logger.info(f"Checking CPPP candidate URL: {url}")
            html = self.fetch_page_content(url, retries=1, backoff=1.0)
            if html:
                logger.info(f"CPPP base URL resolved to: {url}")
                return url
        logger.warning("CPPP base URL resolution failed; defaulting to first candidate.")
        return self.base_url_candidates[0]

    def parse_date(self, date_str: str) -> Optional[datetime]:
        """
        Parse CPPP date strings (e.g., '14-Jun-2026 12:00 PM' or '14-06-2026')
        """
        if not date_str:
            return None
        date_str = re.sub(r"\s+", " ", date_str).strip()
        for fmt in (
            "%d-%b-%Y %I:%M %p", 
            "%d-%b-%Y %H:%M", 
            "%d-%m-%Y %H:%M", 
            "%d-%b-%Y", 
            "%d-%m-%Y"
        ):
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        return None

    def normalize_cppp_link(self, href: str) -> Optional[str]:
        original_href = href
        href = href.strip()
        if not href:
            return None

        if href.lower().startswith("javascript:"):
            match = re.search(r"showBidDocument\(['\"]([^'\"]+)['\"]\)", href, re.IGNORECASE)
            if match:
                href = match.group(1)
            else:
                logger.warning(f"CPPP scraper ignored unsupported javascript link: {original_href}")
                return None

        if href.startswith("//"):
            href = f"https:{href}"

        if not urlparse(href).scheme:
            href = urljoin(self.base_url, href)

        parsed = urlparse(href)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            logger.warning(f"CPPP scraper rejected malformed URL: original={original_href}, normalized={href}")
            return None

        return href

    def scrape(self, limit: int = 15) -> List[Dict[str, Any]]:
        """
        Scrape and parse active tenders from CPPP.
        """
        logger.info(f"Starting CPPP scraper targeting: {self.base_url}")
        html = self.fetch_page_content(self.base_url)
        if not html:
            for fallback_url in self.base_url_candidates:
                if fallback_url == self.base_url:
                    continue
                logger.info(f"Attempting CPPP fallback URL: {fallback_url}")
                html = self.fetch_page_content(fallback_url)
                if html:
                    self.base_url = fallback_url
                    break

        if not html:
            logger.error("Could not fetch CPPP latest active tenders page.")
            return []

        soup = BeautifulSoup(html, "html.parser")
        tenders = []

        # Tenders are usually displayed in a tabular view with class 'list_table'
        table = soup.find("table", class_="list_table") or soup.find("table")
        
        if not table:
            logger.warning("No table found on CPPP. Exploring structural fallbacks.")
            rows = soup.find_all("tr")
        else:
            rows = table.find_all("tr")
            
        logger.info(f"Found {len(rows)} potential table rows on CPPP.")
        
        # Skip header row
        for row in rows[1:]:
            if len(tenders) >= limit:
                break
                
            cols = [col.get_text(separator=" ").strip() for col in row.find_all(["td", "th"])]
            if len(cols) < 6:
                continue

            published_date = cols[1]
            closing_date = cols[2]
            opening_date = cols[3]
            title_ref = cols[4]
            organization = cols[5]

            title_ref = re.sub(r"\s+", " ", title_ref).strip()
            organization = re.sub(r"\s+", " ", organization).strip()

            tender_id = title_ref.rsplit("/", 1)[-1].strip()
            if not tender_id or len(tender_id) < 6:
                tender_id = title_ref[:120]

            title = title_ref
            if "/" in title_ref:
                title = title_ref.rsplit("/", 1)[0].strip()

            deadline = self.parse_date(closing_date)
            pdf_link = None
            links = row.find_all("a", href=True)
            for a in links:
                href = a["href"]
                normalized = self.normalize_cppp_link(href)
                if normalized:
                    logger.debug(f"CPPP scraper normalized URL: original={href}, normalized={normalized}")
                    pdf_link = normalized
                    break

            if pdf_link is None:
                logger.warning(f"CPPP scraper failed to extract a valid URL from row: {title_ref}")

            tenders.append({
                "tender_id": tender_id,
                "title": f"CPPP Tender: {title}",
                "department": organization,
                "location": "New Delhi, India",
                "budget": None,
                "deadline": deadline,
                "eligibility_criteria": f"CPPP Eligibility requirements for Tender ID: {tender_id}. Involves standard qualification criteria outlined by {organization}.",
                "source_url": pdf_link or self.base_url,
                "source_name": "CPPP",
                "raw_html": str(row)
            })

        logger.info(f"CPPP scraper extracted {len(tenders)} live tenders successfully.")
        return tenders
