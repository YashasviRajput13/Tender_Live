"""
GeM and CPPP Scraper Package
Provides live scraping for Government eMarketplace and Central Public Procurement Portal.
"""
from scrapers.base import BaseScraper
from scrapers.cppp_scraper import CPPPScraper
from scrapers.gem_scraper import GeMScraper

__all__ = ["BaseScraper", "CPPPScraper", "GeMScraper"]
