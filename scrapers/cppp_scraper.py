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

    def build_stable_cppp_url(self, href: str, tender_ref: str) -> Optional[str]:
        """
        Build a stable, session-free CPPP URL from a tendersfullview URL.
        The `tendersfullview` URLs contain embedded session tokens (A13h1...) that expire.
        Strategy: decode the first base64 segment to get the numeric tender ID,
        then build a permanent NIC eProcure detail URL.
        """
        import base64
        try:
            path_parts = href.rstrip('/').split('/')
            last_part = path_parts[-1]
            # The base64 segments are separated by 'A13h1' in CPPP URLs
            first_segment = last_part.split('A13h1')[0]
            # Strip existing padding before re-padding to avoid invalid base64
            first_segment = first_segment.rstrip('=')
            # Pad to a valid base64 length (multiple of 4)
            padding_needed = (4 - len(first_segment) % 4) % 4
            padded = first_segment + '=' * padding_needed
            decoded = base64.b64decode(padded).decode('utf-8', errors='ignore').strip()
            if decoded.isdigit():
                # Direct NIC eProcure permanent URL with numeric tender ID
                return f"https://eprocure.gov.in/eprocure/app?page=FrontEndTenderDetails&service=page&id={decoded}"
        except Exception as e:
            logger.debug(f"CPPP base64 decode failed for href={href}: {e}")

        # Fallback: NIC eProcure advanced search by reference number
        from urllib.parse import quote
        safe_ref = quote(tender_ref.strip(), safe='')
        return f"https://eprocure.gov.in/eprocure/app?page=FrontEndAdvancedSearchPage&service=page&searchKey={safe_ref}"

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

    INDIAN_STATES = [
        "Delhi", "New Delhi", "Mumbai", "Maharashtra", "Karnataka", "Tamil Nadu",
        "Telangana", "Gujarat", "Rajasthan", "Uttar Pradesh", "Madhya Pradesh",
        "Punjab", "Haryana", "West Bengal", "Andhra Pradesh", "Kerala", "Odisha",
        "Bihar", "Assam", "Jharkhand", "Chhattisgarh", "Uttarakhand",
        "Himachal Pradesh", "Goa", "Jammu", "Kashmir", "Manipur", "Tripura",
        "Meghalaya", "Nagaland", "Sikkim", "Arunachal Pradesh", "Mizoram"
    ]

    def infer_location(self, organization: str, title: str) -> str:
        """Infer state/city location from organization or title text."""
        combined = f"{organization} {title}".lower()
        for state in self.INDIAN_STATES:
            if state.lower() in combined:
                return state
        return "India"

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

            # Build a stable, session-free URL for this tender.
            # tendersfullview URLs embed session tokens that expire — always convert them.
            stable_url = None
            links = row.find_all("a", href=True)
            for a in links:
                href = a["href"]
                normalized = self.normalize_cppp_link(href)
                if not normalized:
                    continue
                if "tendersfullview" in normalized:
                    # Convert the session URL to a permanent NIC eProcure URL
                    stable_url = self.build_stable_cppp_url(normalized, tender_id)
                    logger.debug(f"CPPP: converted tendersfullview -> {stable_url}")
                    break
                else:
                    # Any other valid link (PDF, etc.) is usable
                    stable_url = normalized
                    break

            # Final fallback: CPPP search by reference number (always unique per tender)
            if not stable_url:
                from urllib.parse import quote
                safe_ref = quote(tender_id.strip(), safe='')
                stable_url = f"https://eprocure.gov.in/eprocure/app?page=FrontEndAdvancedSearchPage&service=page&searchKey={safe_ref}"
                logger.warning(f"CPPP scraper using search fallback URL for: {tender_id}")

            location = self.infer_location(organization, title)

            eligibility_text = (
                f"CPPP Tender {tender_id} issued by {organization}. "
                f"Location: {location}. Closing Date: {closing_date}. "
                f"Bidders must be registered entities with valid GST, PAN, and relevant experience. "
                f"Financial and technical eligibility as per tender document available at source URL. "
                f"Submission of EMD, performance security, and compliance with GFR 2017 mandatory."
            )

            tenders.append({
                "tender_id": tender_id,
                "title": f"CPPP Tender: {title}",
                "department": organization,
                "location": location,
                "budget": None,
                "deadline": deadline,
                "eligibility_criteria": eligibility_text,
                "source_url": stable_url,
                "source_name": "CPPP",
                "raw_html": str(row)
            })

        logger.info(f"CPPP scraper extracted {len(tenders)} live tenders successfully.")
        return tenders
