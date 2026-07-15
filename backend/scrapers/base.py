import time
import random
import logging
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
from curl_cffi import requests

logger = logging.getLogger(__name__)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Edge/122.0.0.0",
]


class BaseScraper(ABC):
    def __init__(
        self, use_proxy: bool = False, proxies: Optional[Dict[str, str]] = None
    ):
        self.use_proxy = use_proxy
        self.proxies = proxies or {}
        self.session = requests.Session()

    def get_random_headers(self) -> Dict[str, str]:
        return {
            "User-Agent": random.choice(USER_AGENTS),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
        }

    def fetch_page_content(
        self, url: str, retries: int = 3, backoff: float = 2.0
    ) -> Optional[str]:
        """
        Fetch HTML content from a URL using curl_cffi with TLS fingerprint evasion.
        """
        for attempt in range(1, retries + 1):
            try:
                headers = self.get_random_headers()
                # curl_cffi has native browser impersonation
                response = self.session.get(
                    url,
                    headers=headers,
                    impersonate="chrome120",  # Impersonate chrome tls signature
                    proxies=self.proxies if self.use_proxy else None,
                    timeout=30,
                )
                if response.status_code == 200:
                    return response.text

                logger.warning(
                    f"Failed to fetch {url} (Status: {response.status_code}) on attempt {attempt}"
                )
            except Exception as e:
                logger.error(f"Error fetching {url} on attempt {attempt}: {str(e)}")

            # Exponential backoff with jitter
            sleep_time = (backoff**attempt) + random.uniform(0.5, 1.5)
            time.sleep(sleep_time)

        return None

    @abstractmethod
    def scrape(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Scrape and return discovered tenders formatted in normalized dict format.
        """
        pass
