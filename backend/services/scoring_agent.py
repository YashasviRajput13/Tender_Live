import json
import logging
from typing import Dict, Any
from services.ai_gemini import ask_llm

logger = logging.getLogger(__name__)

class ScoringAgent:
    def calculate(self, company_profile: Dict[str, Any], tender_details: Dict[str, Any], eligibility_report: Dict[str, Any]) -> int:
        """
        Evaluate and return a score from 0 to 100 representing how suitable this tender is for the company.
        """
        logger.info(f"Running Opportunity Scoring Agent for tender {tender_details.get('tender_id')}")
        
        prompt = f"""
        You are a Bid Pricing & Risk Strategy Auditor. You need to assign an 'Opportunity Suitability Score' from 0 to 100 for this tender based on the company's capability and match details.

        COMPANY PROFILE:
        - Name: {company_profile.get('name')}
        - Required Categories: {company_profile.get('required_categories')}
        - Industry: {company_profile.get('industry')}
        - Turnover (Lakhs): {company_profile.get('turnover')}
        - Past Projects: {json.dumps(company_profile.get('past_projects', []))}
        - Geographic Coverage: {company_profile.get('geographic_coverage')}

        TENDER DETAILS:
        - Title: {tender_details.get('title')}
        - Budget: {tender_details.get('budget')}
        - Location: {tender_details.get('location')}

        ELIGIBILITY WORKFLOW RESULT:
        - Status: {eligibility_report.get('eligibility')}
        - Confidence: {eligibility_report.get('confidence_score')}
        - Financial Match: {json.dumps(eligibility_report.get('financial_match'))}
        - Technical Match: {json.dumps(eligibility_report.get('technical_match'))}
        - Location Match: {json.dumps(eligibility_report.get('location_match'))}

        SCORING MATRIX:
        1. Eligibility Match (40 pts): 'eligible' = 40, 'partially_eligible' = 20, 'not_eligible' = 0.
        2. Budget Suitability (20 pts): Does the tender budget align with their standard scope? (If budget is way too high relative to company turnover, penalize. If budget fits comfortably within past project values, award full points.)
        3. Geographic Relevance (15 pts): Does the tender location fit their geographic coverage list?
        4. Industry Category Relevance (15 pts): Does the tender title map directly to their categories?
        5. Competition Estimate (10 pts): Estimate competition density based on sector and scale.

        Respond with a JSON object following EXACTLY this structure:
        {{
            "score": 0 to 100,
            "score_breakdown": {{
                "eligibility_match_points": 0 to 40,
                "budget_suitability_points": 0 to 20,
                "geographic_relevance_points": 0 to 15,
                "industry_relevance_points": 0 to 15,
                "competition_points": 0 to 10
            }},
            "justification": "Short 1-2 sentence justification for the overall score."
        }}
        """
        
        try:
            response_text = ask_llm(prompt, json_mode=True)
            result = json.loads(response_text)
            score = int(result.get("score", 50))
            # Bound check
            return max(0, min(100, score))
        except Exception as e:
            logger.error(f"Failed during Scoring agent execution: {str(e)}")
            # Mathematical baseline fallback
            score = 50
            if eligibility_report.get("eligibility") == "eligible":
                score += 20
            elif eligibility_report.get("eligibility") == "not_eligible":
                score -= 30
            return max(0, min(100, score))
            
definition_instance = ScoringAgent()
