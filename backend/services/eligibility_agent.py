import json
import logging
from typing import Dict, Any
from services.ai_gemini import ask_llm

logger = logging.getLogger(__name__)

class EligibilityAgent:
    def analyze(self, company_profile: Dict[str, Any], tender_details: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluate if a company is eligible, partially eligible, or not eligible for a tender.
        Returns a structured dictionary of requirements matching.
        """
        logger.info(f"Running Eligibility analysis for company {company_profile.get('name')} and tender {tender_details.get('tender_id')}")
        
        prompt = f"""
        You are an elite AI Tender Bid Consultant. Your job is to meticulously analyze whether a company is eligible to bid on a specific government tender based on the company's profile.

        COMPANY PROFILE:
        - Name: {company_profile.get('name')}
        - Industry: {company_profile.get('industry')}
        - Turnover (in INR Lakhs): {company_profile.get('turnover')}
        - MSME Status: {"MSME Registered" if company_profile.get('msme_status') else "Non-MSME"}
        - Certifications: {company_profile.get('certifications')}
        - Geographic Coverage: {company_profile.get('geographic_coverage')}
        - Required Tender Categories: {company_profile.get('required_categories')}
        - Past Projects: {json.dumps(company_profile.get('past_projects', []))}

        TENDER DETAILS:
        - Title: {tender_details.get('title')}
        - Tender ID: {tender_details.get('tender_id')}
        - Department: {tender_details.get('department')}
        - Location: {tender_details.get('location')}
        - Budget (in INR): {tender_details.get('budget')}
        - Deadline: {tender_details.get('deadline')}
        - Eligibility Criteria: {tender_details.get('eligibility_criteria')}

        Perform a comparative review analyzing:
        1. Financial eligibility (Does company turnover meet estimate demands?)
        2. Technical/Industry eligibility (Does the company have matching capabilities?)
        3. Experience eligibility (Do past project values match tender scope requirements?)
        4. MSME preferences (Does the tender offer MSME exemptions or price preferences?)
        5. Location suitability.

        Respond with a JSON object following EXACTLY this structure:
        {{
            "eligibility": "eligible" | "partially_eligible" | "not_eligible",
            "confidence_score": 0.0 to 1.0,
            "financial_match": {{
                "status": "pass" | "fail" | "conditional",
                "details": "string detailing turnover comparison"
            }},
            "technical_match": {{
                "status": "pass" | "fail" | "conditional",
                "details": "string detailing industry experience fit"
            }},
            "experience_match": {{
                "status": "pass" | "fail" | "conditional",
                "details": "string comparing past projects values with the budget scope"
            }},
            "msme_advantage": {{
                "applicable": true | false,
                "details": "details on MSME exemptions or preferences"
            }},
            "location_match": {{
                "status": "pass" | "fail",
                "details": "location details"
            }},
            "overall_rationale": "Clear executive summary detailing why they are eligible, partially eligible or not eligible."
        }}
        """
        
        try:
            response_text = ask_llm(prompt, json_mode=True)
            return json.loads(response_text)
        except Exception as e:
            logger.error(f"Failed during Eligibility agent execution: {str(e)}")
            # Deterministic fallback based on sector overlap
            from services.scoring_agent import ScoringAgent
            scorer = ScoringAgent()
            company_sectors = scorer._get_company_sectors(company_profile)
            tender_text = f"{tender_details.get('title', '')} {tender_details.get('department', '')}"
            tender_sectors = scorer._get_sectors_from_text(tender_text)
            overlap = company_sectors & tender_sectors
            
            eligibility = "eligible" if len(overlap) >= 2 else ("partially_eligible" if overlap else "not_eligible")
            return {
                "eligibility": eligibility,
                "confidence_score": 0.8 if overlap else 0.2,
                "financial_match": {"status": "conditional", "details": "AI unavailable — financial check skipped"},
                "technical_match": {"status": "pass" if overlap else "fail", "details": f"Sector overlap: {overlap}"},
                "experience_match": {"status": "conditional", "details": "AI unavailable"},
                "msme_advantage": {"applicable": bool(company_profile.get("msme_status")), "details": "MSME status from profile"},
                "location_match": {"status": "pass", "details": "AI unavailable — defaulting to pass"},
                "overall_rationale": f"AI unavailable. Deterministic fallback: sector overlap = {overlap}"
            }
definition_instance = EligibilityAgent()
