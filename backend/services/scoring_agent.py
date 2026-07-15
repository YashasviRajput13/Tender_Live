import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


class ScoringAgent:
    """
    Deterministic weighted scoring engine.
    AI is used only for generating human-readable justification text.
    The numeric score is 100% rule-based.

    SCORING FORMULA:
    ┌─────────────────────────────┬────────┐
    │ Component                   │ Weight │
    ├─────────────────────────────┼────────┤
    │ Industry/Category Match     │  30%   │
    │ Technical Capability Match  │  25%   │
    │ Past Experience Match       │  20%   │
    │ Certification Match         │  10%   │
    │ Financial Eligibility       │  10%   │
    │ Geographic Match            │   5%   │
    └─────────────────────────────┴────────┘
    """

    # Keywords that indicate sector categories
    SECTOR_KEYWORDS = {
        "it_software": [
            "software",
            "application",
            "portal",
            "web",
            "mobile",
            "app",
            "digital",
            "erp",
            "crm",
            "saas",
            "platform",
            "system integration",
            "e-governance",
            "egovernance",
            "it service",
            "ict",
        ],
        "cloud_infra": [
            "cloud",
            "hosting",
            "infrastructure",
            "server",
            "datacenter",
            "data center",
            "colocation",
            "iaas",
            "paas",
            "migration",
            "devops",
        ],
        "cybersecurity": [
            "security",
            "cybersecurity",
            "firewall",
            "soc",
            "vapt",
            "penetration testing",
            "siem",
            "endpoint",
            "iso 27001",
            "compliance",
        ],
        "ai_ml": [
            "artificial intelligence",
            "machine learning",
            "ai",
            "ml",
            "analytics",
            "data science",
            "nlp",
            "computer vision",
            "chatbot",
        ],
        "networking": [
            "network",
            "wan",
            "lan",
            "vpn",
            "connectivity",
            "bandwidth",
            "fiber",
            "leased line",
            "mpls",
            "switching",
            "routing",
        ],
        "civil_construction": [
            "road",
            "civil",
            "construction",
            "bridge",
            "building",
            "concrete",
            "rcc",
            "structural",
            "foundation",
            "earthwork",
            "drainage",
        ],
        "electrical": [
            "electrical",
            "power",
            "transformer",
            "substation",
            "wiring",
            "generator",
            "ups",
            "solar",
            "renewable energy",
        ],
        "mechanical": [
            "mechanical",
            "hvac",
            "plumbing",
            "pump",
            "valve",
            "piping",
            "fabrication",
            "welding",
            "equipment supply",
        ],
        "printing_media": [
            "printing",
            "publication",
            "media",
            "broadcast",
            "content",
            "advertising",
            "design",
            "branding",
        ],
        "medical_health": [
            "medical",
            "hospital",
            "health",
            "pharmaceutical",
            "equipment supply",
            "diagnostic",
            "ambulance",
            "nursing",
        ],
    }

    def _normalize_text(self, text: str) -> str:
        return (text or "").lower().strip()

    def _get_sectors_from_text(self, text: str) -> set:
        """Map free-form text to known sector tags."""
        text_lower = self._normalize_text(text)
        matched = set()
        for sector, keywords in self.SECTOR_KEYWORDS.items():
            if any(kw in text_lower for kw in keywords):
                matched.add(sector)
        return matched

    def _get_company_sectors(self, company: Dict[str, Any]) -> set:
        """Extract all sectors from company profile fields."""
        sectors = set()
        # From required_categories list
        for cat in company.get("required_categories") or []:
            sectors |= self._get_sectors_from_text(str(cat))
        # From industry field
        sectors |= self._get_sectors_from_text(str(company.get("industry") or ""))
        # From past project titles
        for proj in company.get("past_projects") or []:
            if isinstance(proj, dict):
                sectors |= self._get_sectors_from_text(str(proj.get("title", "")))
                sectors |= self._get_sectors_from_text(str(proj.get("description", "")))
        return sectors

    def _score_industry_match(
        self, company: Dict[str, Any], tender: Dict[str, Any]
    ) -> tuple[int, str]:
        """
        Industry/Category Match — 30 points max.
        Compares company sectors against tender title + department text.
        """
        company_sectors = self._get_company_sectors(company)
        tender_text = f"{tender.get('title', '')} {tender.get('department', '')} {tender.get('eligibility_criteria', '')}"
        tender_sectors = self._get_sectors_from_text(tender_text)

        if not company_sectors:
            return 0, "No company categories found to match against."

        overlap = company_sectors & tender_sectors
        if not overlap:
            return (
                0,
                f"No sector overlap. Company: {company_sectors}. Tender: {tender_sectors}.",
            )

        match_ratio = len(overlap) / max(len(tender_sectors), 1)
        points = round(min(30, match_ratio * 30 + (10 if len(overlap) >= 2 else 0)))
        return (
            points,
            f"Matched sectors: {overlap}. Company sectors: {company_sectors}.",
        )

    def _score_technical_capability(
        self,
        company: Dict[str, Any],
        tender: Dict[str, Any],
        eligibility: Dict[str, Any],
    ) -> tuple[int, str]:
        """
        Technical Capability Match — 25 points max.
        Uses eligibility agent's technical_match result + keyword verification.
        """
        tech_match = eligibility.get("technical_match") or {}
        status = tech_match.get("status", "")

        base = {"pass": 25, "conditional": 13, "fail": 0}.get(status, 12)

        # Bonus: verify certifications mentioned in tender match company certs
        company_certs = self._normalize_text(str(company.get("certifications") or ""))
        tender_text = self._normalize_text(
            f"{tender.get('title', '')} {tender.get('eligibility_criteria', '')}"
        )

        cert_bonus = 0
        cert_keywords = [
            "iso 9001",
            "iso 27001",
            "cmmi",
            "ce mark",
            "bis",
            "gst registered",
        ]
        for cert in cert_keywords:
            if cert in tender_text and cert in company_certs:
                cert_bonus += 2

        points = min(25, base + cert_bonus)
        return (
            points,
            f"Technical status: {status}. Cert bonus: {cert_bonus}pts. Details: {tech_match.get('details', '')}.",
        )

    def _score_past_experience(
        self,
        company: Dict[str, Any],
        tender: Dict[str, Any],
        eligibility: Dict[str, Any],
    ) -> tuple[int, str]:
        """
        Past Experience Match — 20 points max.
        Checks project relevance + value alignment with tender budget.
        """
        experience_match = eligibility.get("experience_match") or {}
        status = experience_match.get("status", "")
        base = {"pass": 15, "conditional": 8, "fail": 0}.get(status, 8)

        # Value alignment bonus: company turnover vs tender budget
        tender_budget = tender.get("budget") or 0
        company_turnover_lakhs = float(company.get("turnover") or 0)
        company_turnover_rupees = company_turnover_lakhs * 100_000

        value_bonus = 0
        if tender_budget and company_turnover_rupees:
            ratio = tender_budget / company_turnover_rupees
            if 0.1 <= ratio <= 3.0:  # Budget is 10%–300% of turnover: comfortable
                value_bonus = 5
            elif ratio <= 0.1:  # Very small tender relative to company size
                value_bonus = 3
            elif ratio > 10:  # Budget massively exceeds company capacity
                value_bonus = 0
                base = min(base, 5)  # Penalize

        points = min(20, base + value_bonus)
        return (
            points,
            f"Experience status: {status}. Budget/Turnover ratio: {round(tender_budget / max(company_turnover_rupees, 1), 2)}. Value bonus: {value_bonus}pts.",
        )

    def _score_certifications(
        self, company: Dict[str, Any], tender: Dict[str, Any]
    ) -> tuple[int, str]:
        """
        Certification Match — 10 points max.
        Checks if tender requires specific certs the company holds.
        """
        company_certs = self._normalize_text(str(company.get("certifications") or ""))
        tender_text = self._normalize_text(
            f"{tender.get('eligibility_criteria', '')} {tender.get('title', '')}"
        )

        cert_map = {
            "iso 9001": 3,
            "iso 27001": 3,
            "cmmi": 3,
            "msme": 2,
            "nsic": 2,
            "gem": 1,
            "gst": 1,
        }

        matched_certs = []
        required_certs = []
        points = 0

        for cert, weight in cert_map.items():
            in_tender = cert in tender_text
            in_company = cert in company_certs
            if in_tender:
                required_certs.append(cert)
                if in_company:
                    points += weight
                    matched_certs.append(cert)

        # MSME bonus if applicable
        if company.get("msme_status") and "msme" in tender_text:
            points += 2
            matched_certs.append("MSME preference")

        if not required_certs:
            points = 5  # No cert requirements = neutral, give half points

        points = min(10, points)
        return points, f"Required: {required_certs}. Matched: {matched_certs}."

    def _score_financial_eligibility(
        self,
        company: Dict[str, Any],
        tender: Dict[str, Any],
        eligibility: Dict[str, Any],
    ) -> tuple[int, str]:
        """
        Financial Eligibility — 10 points max.
        """
        fin_match = eligibility.get("financial_match") or {}
        status = fin_match.get("status", "")
        points = {"pass": 10, "conditional": 5, "fail": 0}.get(status, 5)
        return points, f"Financial status: {status}. {fin_match.get('details', '')}."

    def _score_geographic_match(
        self,
        company: Dict[str, Any],
        tender: Dict[str, Any],
        eligibility: Dict[str, Any],
    ) -> tuple[int, str]:
        """
        Geographic Match — 5 points max.
        """
        loc_match = eligibility.get("location_match") or {}
        status = loc_match.get("status", "")
        if status == "pass":
            return 5, f"Location match confirmed: {loc_match.get('details', '')}."

        # Fallback: keyword check if eligibility agent failed
        company_locations = [
            self._normalize_text(str(loc))
            for loc in (company.get("geographic_coverage") or [])
        ]
        tender_location = self._normalize_text(str(tender.get("location") or ""))

        if not tender_location or not company_locations:
            return 3, "Location data missing — awarding partial points."

        # Pan-India companies cover everywhere
        if any(
            loc in ["india", "pan india", "pan-india", "all india", "nationwide"]
            for loc in company_locations
        ):
            return 5, "Company has pan-India coverage."

        if any(
            loc in tender_location or tender_location in loc
            for loc in company_locations
        ):
            return 5, f"Location '{tender_location}' covered by company."

        return (
            0,
            f"Company coverage {company_locations} does not include '{tender_location}'.",
        )

    def calculate(
        self,
        company_profile: Dict[str, Any],
        tender_details: Dict[str, Any],
        eligibility_report: Dict[str, Any],
    ) -> int:
        """
        Deterministic weighted scoring. Returns 0–100.
        AI is NOT involved in score calculation.
        """
        logger.info(
            f"[ScoringAgent] Starting deterministic scoring for tender {tender_details.get('tender_id')}"
        )

        industry_pts, industry_reason = self._score_industry_match(
            company_profile, tender_details
        )
        technical_pts, technical_reason = self._score_technical_capability(
            company_profile, tender_details, eligibility_report
        )
        experience_pts, exp_reason = self._score_past_experience(
            company_profile, tender_details, eligibility_report
        )
        cert_pts, cert_reason = self._score_certifications(
            company_profile, tender_details
        )
        financial_pts, fin_reason = self._score_financial_eligibility(
            company_profile, tender_details, eligibility_report
        )
        geo_pts, geo_reason = self._score_geographic_match(
            company_profile, tender_details, eligibility_report
        )

        total = (
            industry_pts
            + technical_pts
            + experience_pts
            + cert_pts
            + financial_pts
            + geo_pts
        )

        logger.info(
            f"[ScoringAgent] SCORE BREAKDOWN for {tender_details.get('tender_id')}:\n"
            f"  Industry Match     : {industry_pts}/30  — {industry_reason}\n"
            f"  Technical Cap      : {technical_pts}/25  — {technical_reason}\n"
            f"  Past Experience    : {experience_pts}/20  — {exp_reason}\n"
            f"  Certifications     : {cert_pts}/10  — {cert_reason}\n"
            f"  Financial Elig     : {financial_pts}/10  — {fin_reason}\n"
            f"  Geographic Match   : {geo_pts}/5   — {geo_reason}\n"
            f"  ─────────────────────────────────\n"
            f"  TOTAL              : {total}/100"
        )

        return max(0, min(100, total))


definition_instance = ScoringAgent()
