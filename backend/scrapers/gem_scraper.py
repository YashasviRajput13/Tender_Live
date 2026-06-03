import re
import json
import logging
import time
from bs4 import BeautifulSoup
from datetime import datetime
from decimal import Decimal
from typing import List, Dict, Any, Optional
from curl_cffi import requests
from scrapers.base import BaseScraper

logger = logging.getLogger(__name__)

class GeMScraper(BaseScraper):
    def __init__(self, use_proxy: bool = False, proxies: Optional[Dict[str, str]] = None):
        super().__init__(use_proxy, proxies)
        self.base_url_candidates = [
            "https://bidplus.gem.gov.in/all-bids",
            "https://bidplus.gem.gov.in/bidlists",
            "https://bidplus.gem.gov.in/bidlist",
            "https://bidplus.gem.gov.in/",
            "https://gem.gov.in/bidlists"
        ]
        self.base_url = self.resolve_base_url()

    def resolve_base_url(self) -> str:
        for url in self.base_url_candidates:
            logger.info(f"Checking GeM candidate URL: {url}")
            html = self.fetch_page_content(url, retries=1, backoff=1.0)
            if html:
                logger.info(f"GeM base URL resolved to: {url}")
                return url
        logger.warning("GeM base URL resolution failed; defaulting to first candidate.")
        return self.base_url_candidates[0]

    def parse_date(self, date_str: str) -> Optional[datetime]:
        """
        Parse date formats commonly found in GeM bids (e.g., '30-05-2026 18:00:00' or '2026-06-01T09:00:00Z').
        """
        if not date_str:
            return None
        date_str = date_str.strip()
        for fmt in (
            "%d-%m-%Y %H:%M:%S",
            "%d-%m-%Y %H:%M",
            "%d-%m-%Y",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%dT%H:%M:%SZ"
        ):
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        return None

    def extract_csrf_token(self, html: str) -> Optional[str]:
        match = re.search(r"csrf_bd_gem_nk['\"]\s*:\s*['\"]([0-9a-f]+)['\"]", html)
        if match:
            return match.group(1)
        return None

    def scrape_from_json_api(self, html: str, limit: int = 15) -> List[Dict[str, Any]]:
        """
        Scrape GeM tenders from the JSON endpoint underlying the all-bids page.
        """
        session = requests.Session()
        headers = {
            "User-Agent": self.get_random_headers()["User-Agent"],
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Referer": self.base_url,
            "Origin": "https://bidplus.gem.gov.in",
            "X-Requested-With": "XMLHttpRequest",
            "Accept-Language": "en-US,en;q=0.9",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
        }

        page_response = session.get(
            self.base_url,
            headers={
                "User-Agent": headers["User-Agent"],
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Referer": self.base_url,
                "Accept-Language": "en-US,en;q=0.9"
            },
            impersonate="chrome120",
            timeout=30
        )
        if page_response.status_code != 200:
            logger.error(f"GeM all-bids page GET returned status {page_response.status_code}")
            return []

        page_html = page_response.text
        csrf_token = self.extract_csrf_token(page_html)
        postdata = {
            "param": {
                "searchBid": "",
                "searchType": "fullText"
            },
            "filter": {
                "bidStatusType": "ongoing_bids",
                "byType": "all",
                "highBidValue": "",
                "byEndDate": {"from": "", "to": ""},
                "sort": "Bid-End-Date-Oldest"
            },
            "currentPage": 1
        }

        payload = {
            "payload": json.dumps(postdata),
            "csrf_bd_gem_nk": csrf_token or ""
        }

        docs = []
        for attempt in range(1, 4):
            try:
                json_response = session.post(
                    "https://bidplus.gem.gov.in/all-bids-data",
                    data=payload,
                    headers=headers,
                    impersonate="chrome120",
                    timeout=30
                )
                if json_response.status_code == 200:
                    response = json.loads(json_response.text)
                    docs = response.get("response", {}).get("response", {}).get("docs", [])
                    if docs:
                        break
                    logger.warning(f"GeM JSON API returned empty docs on attempt {attempt}.")
                else:
                    logger.warning(f"GeM JSON API returned status {json_response.status_code} on attempt {attempt}.")
            except Exception as e:
                logger.warning(f"GeM JSON API attempt {attempt} failed: {e}")

            if attempt < 4:
                time.sleep(2 * attempt)

        if not docs:
            logger.warning("GeM JSON API did not return active docs after retries. Falling back to HTML scraping.")
            return self.scrape_html_fallback(limit)

        tenders = []
        for doc in docs:
            if len(tenders) >= limit:
                break

            tender_id = (doc.get("b_bid_number") or [""])[0]
            if not tender_id:
                continue

            title_text = (doc.get("b_category_name") or [""])[0]
            if not title_text:
                title_text = (doc.get("bd_category_name") or [""])[0]

            if title_text and "," in title_text:
                title_text = title_text.split(",")[0].strip()

            department = (doc.get("ba_official_details_deptName") or [""])[0]
            if not department:
                department = (doc.get("ba_official_details_minName") or [""])[0]

            deadline = self.parse_date((doc.get("final_end_date_sort") or [""])[0])
            source_id = (doc.get("b_id") or [None])[0]
            source_url = f"https://bidplus.gem.gov.in/public-bid-other-details/{source_id}" if source_id else self.base_url

            # Parse budget from estimated_bid_value
            budget = None
            estimated_val = doc.get("estimated_bid_value")
            if estimated_val:
                try:
                    raw = estimated_val[0] if isinstance(estimated_val, list) else estimated_val
                    budget = Decimal(str(raw)) if raw else None
                except Exception:
                    pass

            # Parse real location from state/city fields
            state = (doc.get("ba_official_details_stateName") or [""])[0]
            city = (doc.get("ba_official_details_cityName") or [""])[0]
            if city and state:
                location = f"{city}, {state}"
            elif state:
                location = state
            elif city:
                location = city
            else:
                location = "India"

            # Build meaningful eligibility criteria from category + MSME flag
            categories = doc.get("b_category_name") or []
            cats_text = ", ".join(str(c) for c in (categories[:3] if isinstance(categories, list) else [str(categories)]) if c)
            msme_flag = (doc.get("b_msme") or [False])[0]
            eligibility_text = (
                f"GeM Bid {tender_id} – Item Category: {cats_text or title_text}. "
                f"Department: {department or 'Government of India'}. Location: {location}. "
                f"MSME preference: {'Yes – MSME vendors receive price preference and EMD exemption.' if msme_flag else 'Standard – No special MSME preference specified.'} "
                f"Bidder must be registered on GeM portal, meet quantity/delivery requirements, "
                f"and comply with GeM General Terms & Conditions (GTC). "
                f"Financial, technical, and past supply experience eligibility as per bid document."
            )

            tenders.append({
                "tender_id": tender_id,
                "title": f"GeM Bid: {title_text}",
                "department": department or "GeM Government Bid",
                "location": location,
                "budget": budget,
                "deadline": deadline,
                "eligibility_criteria": eligibility_text,
                "source_url": source_url,
                "source_name": "GeM",
                "raw_html": json.dumps(doc)
            })

        logger.info(f"GeM JSON API extracted {len(tenders)} live tenders successfully.")
        return tenders

    def scrape_html_fallback(self, limit: int = 15) -> List[Dict[str, Any]]:
        """
        Fallback HTML scraper for GeM when the JSON endpoint is not available.
        """
        html = self.fetch_page_content(self.base_url)
        if not html and self.base_url != "https://bidplus.gem.gov.in/bidlists":
            html = self.fetch_page_content("https://bidplus.gem.gov.in/bidlists")

        if not html:
            logger.error("GeM HTML fallback could not retrieve any page content.")
            return []

        soup = BeautifulSoup(html, "html.parser")
        tenders = []
        bid_blocks = soup.find_all("div", class_="card") or soup.find_all("div", class_="border")
        if not bid_blocks:
            rows = soup.find_all("tr")
            logger.info(f"GeM HTML fallback found {len(rows)} table rows.")
            for row in rows:
                cols = [col.get_text(separator=" ").strip() for col in row.find_all(["td", "th"])]
                if len(cols) < 3:
                    continue
                row_text = " ".join(cols)
                bid_no_match = re.search(r"GEM/\d{4}/[A-Z]/\d+", row_text)
                if not bid_no_match:
                    continue
                tender_id = bid_no_match.group(0)
                title = cols[2]
                department = cols[1] if len(cols) > 1 else "GeM Department"
                deadline = self.parse_date(cols[-1])
                tenders.append({
                    "tender_id": tender_id,
                    "title": f"GeM Bid: {title}",
                    "department": department,
                    "location": "India",
                    "budget": None,
                    "deadline": deadline,
                    "eligibility_criteria": f"GeM procurement eligibility details for {tender_id}.",
                    "source_url": self.base_url,
                    "source_name": "GeM",
                    "raw_html": str(row)
                })
                if len(tenders) >= limit:
                    break
        else:
            logger.info(f"GeM HTML fallback found {len(bid_blocks)} bid blocks.")
            for block in bid_blocks:
                if len(tenders) >= limit:
                    break
                block_text = block.get_text(separator=" ").strip()
                bid_no_match = re.search(r"GEM/\d{4}/[A-Z]/\d+", block_text)
                if not bid_no_match:
                    continue
                tender_id = bid_no_match.group(0)
                title = re.sub(r"\s+", " ", block_text)[:120]
                deadline = None
                end_date_match = re.search(r"End\s+Date\s*[:/]\s*([\d\-:\s]+)", block_text, re.IGNORECASE)
                if end_date_match:
                    deadline = self.parse_date(end_date_match.group(1))
                tenders.append({
                    "tender_id": tender_id,
                    "title": f"GeM Bid: {title}",
                    "department": "GeM",
                    "location": "India",
                    "budget": None,
                    "deadline": deadline,
                    "eligibility_criteria": f"GeM procurement eligibility details for {tender_id}.",
                    "source_url": self.base_url,
                    "source_name": "GeM",
                    "raw_html": str(block)
                })

        logger.info(f"GeM HTML fallback extracted {len(tenders)} live tenders successfully.")
        return tenders

    def scrape(self, limit: int = 15) -> List[Dict[str, Any]]:
        """
        Scrape live active tenders from Government eMarketplace (GeM) bids list.
        """
        logger.info(f"Starting GeM scraper targeting: {self.base_url}")
        html = self.fetch_page_content(self.base_url)
        if not html:
            for fallback_url in self.base_url_candidates:
                if fallback_url == self.base_url:
                    continue
                logger.info(f"Attempting GeM fallback URL: {fallback_url}")
                html = self.fetch_page_content(fallback_url)
                if html:
                    self.base_url = fallback_url
                    break

        if not html:
            logger.error("Could not fetch HTML from GeM Bid Lists. Site might be blocking or offline.")
            return []

        # If we are hitting the new GeM all-bids page, use the JSON endpoint behind it.
        if self.base_url.endswith("/all-bids"):
            return self.scrape_from_json_api(html, limit)

        soup = BeautifulSoup(html, "html.parser")
        tenders = []
        
        # Locate bid cards. Usually inside divs with class 'border' or specific list structures
        bid_blocks = soup.find_all("div", class_="card") or soup.find_all("div", class_="border")
        
        # Fallback if page structure differs (e.g. table-based)
        if not bid_blocks:
            rows = soup.find_all("tr")
            if len(rows) > 1:
                logger.info(f"No card containers found, falling back to table row parsing on {len(rows)} rows.")
        
        logger.info(f"Found {len(bid_blocks)} potential bid containers on GeM.")
        
        for block in bid_blocks:
            if len(tenders) >= limit:
                break
                
            block_text = block.get_text(separator=" ").strip()
            
            # Search for typical GeM Bid Numbers: GEM/2026/B/XXXX or GEM/XXXX
            bid_no_match = re.search(r"GEM/\d{4}/[A-Z]/\d+", block_text)
            if not bid_no_match:
                # Try a looser pattern
                bid_no_match = re.search(r"GEM/\d+/[A-Z]/\d+", block_text)
                if not bid_no_match:
                    bid_no_match = re.search(r"Bid\s+Number:\s*([^\s\n\r]+)", block_text, re.IGNORECASE)
                    
            if not bid_no_match:
                continue
                
            tender_id = bid_no_match.group(1) if hasattr(bid_no_match, "group") and len(bid_no_match.groups()) > 0 else bid_no_match.group(0)
            tender_id = tender_id.replace("Bid Number:", "").strip()
            
            # Parse dates
            # GeM displays 'Bid End Date/Time:' or 'End Date'
            end_date_match = re.search(r"End\s+Date\s*[:/]\s*([\d\-:\s]+)", block_text, re.IGNORECASE)
            if not end_date_match:
                end_date_match = re.search(r"[\d]{2}-[\d]{2}-[\d]{4}\s+[\d]{2}:[\d]{2}:[\d]{2}", block_text)
            
            deadline = None
            if end_date_match:
                deadline_str = end_date_match.group(1) if len(end_date_match.groups()) > 0 else end_date_match.group(0)
                deadline = self.parse_date(deadline_str)
            
            # Items/Title details
            # Usually says "Items:" or "Item Category:" or "Product:"
            items_match = re.search(r"Items?\s*:\s*([^:\n]+)", block_text, re.IGNORECASE)
            if not items_match:
                items_match = re.search(r"Category\s*:\s*([^:\n]+)", block_text, re.IGNORECASE)
                
            title = items_match.group(1).strip() if items_match else "Procurement of Products/Services"
            # Clean title
            title = re.sub(r"\s+", " ", title).strip()
            
            # Department Name
            dept_match = re.search(r"Department\s*:\s*([^:\n]+)", block_text, re.IGNORECASE)
            if not dept_match:
                dept_match = re.search(r"Ministry\s*:\s*([^:\n]+)", block_text, re.IGNORECASE)
            
            department = dept_match.group(1).strip() if dept_match else "Ministry of Commerce & Industry"
            department = re.sub(r"\s+", " ", department).strip()
            
            # Location
            location_match = re.search(r"Location\s*:\s*([^:\n]+)", block_text, re.IGNORECASE)
            location = location_match.group(1).strip() if location_match else "New Delhi, India"
            
            # Budget - GeM bids sometimes hide or omit budget (estimates are generated or read from PDF link)
            # Default to None or look for financial values
            budget_match = re.search(r"Value\s*:\s*₹?\s*([\d,]+)", block_text, re.IGNORECASE)
            budget = None
            if budget_match:
                try:
                    budget_str = budget_match.group(1).replace(",", "")
                    budget = Decimal(budget_str)
                except Exception:
                    pass
            
            # PDF Bid Document Link
            # Find any PDF links inside this block
            pdf_link = None
            links = block.find_all("a", href=True)
            for a in links:
                href = a["href"]
                if ".pdf" in href.lower() or "showBidDocument" in href:
                    if href.startswith("http"):
                        pdf_link = href
                    else:
                        pdf_link = f"https://bidplus.gem.gov.in{href}"
                    break
            
            tenders.append({
                "tender_id": tender_id,
                "title": f"GeM Bid: {title}",
                "department": department,
                "location": location,
                "budget": budget,
                "deadline": deadline,
                "eligibility_criteria": f"GeM Bid Terms for {tender_id}. Must comply with GeM general terms & conditions (GTC).",
                "source_url": pdf_link or self.base_url,
                "source_name": "GeM",
                "raw_html": str(block)
            })
            
        logger.info(f"GeM scraper extracted {len(tenders)} live tenders successfully.")
        return tenders
