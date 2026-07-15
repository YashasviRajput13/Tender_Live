import json
import logging
from typing import Dict, Any
from services.ai_gemini import ask_llm

logger = logging.getLogger(__name__)


class SummaryAgent:
    def summarize(self, tender_details: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze a tender details block and extract summaries, risks, timelines, and checklists.
        """
        logger.info(
            f"Running Summarization Agent for tender {tender_details.get('tender_id')}"
        )

        prompt = f"""
        You are a highly efficient Bid Response Summarizer. Extract the most important business insights from the following tender:

        TENDER TITLE: {tender_details.get("title")}
        DEPARTMENT: {tender_details.get("department")}
        ELIGIBILITY CRITERIA DETAIL: {tender_details.get("eligibility_criteria")}
        RAW DATA / HTML CARD: {tender_details.get("raw_html")}
        DEADLINE: {tender_details.get("deadline")}

        Generate an easy-to-read executive summary, identify potential risk factors, build a key milestone timeline, and create a compliance checklist of documents required for submission.

        Respond with a JSON object following EXACTLY this structure:
        {{
            "executive_summary": "High-level summary of what this tender is requesting.",
            "key_requirements": [
                "Requirement 1 (e.g. Turnkey delivery)",
                "Requirement 2 (e.g. 3 years post support)"
            ],
            "risks": [
                "Risk 1 (e.g. Short delivery window of 45 days)",
                "Risk 2 (e.g. High security deposit requirements)"
            ],
            "timeline": {{
                "publishing_date": "Publish date or 'Not specified'",
                "pre_bid_meeting": "Pre-bid meeting date or 'None scheduled'",
                "submission_deadline": "{tender_details.get("deadline") or "Not specified"}",
                "clarification_deadline": "Clarification end date or 'Not specified'"
            }},
            "financial_info": {{
                "emd": "Extracted EMD amount or 'Not specified'",
                "tender_fee": "Extracted Tender Fee or 'Not specified'",
                "performance_security": "Extracted Performance Security or 'Not specified'",
                "bid_validity": "Extracted Bid Validity or 'Not specified'"
            }},
            "submission_checklist": [
                "Ex: Valid GST Registration Certificate",
                "Ex: Audited Financial balance sheets of last 3 years",
                "Ex: MSME Certificate if claiming exemptions",
                "Ex: Signed Bid Securing Declaration"
            ]
        }}
        """

        try:
            response_text = ask_llm(prompt, json_mode=True)
            return json.loads(response_text)
        except Exception as e:
            logger.error(f"Failed during Summarization agent execution: {str(e)}")
            return {
                "executive_summary": f"Could not compute AI summary for {tender_details.get('title')}. Direct parsing failed.",
                "key_requirements": ["Check eligibility terms manually"],
                "risks": [
                    "Unable to determine automatic risk. Review manual documentation."
                ],
                "timeline": {
                    "publishing_date": "Not specified",
                    "pre_bid_meeting": "None scheduled",
                    "submission_deadline": str(
                        tender_details.get("deadline") or "Not specified"
                    ),
                    "clarification_deadline": "Not specified",
                },
                "financial_info": {
                    "emd": "Not specified",
                    "tender_fee": "Not specified",
                    "performance_security": "Not specified",
                    "bid_validity": "Not specified",
                },
                "submission_checklist": [
                    "General bid documents",
                    "Company registration proofs",
                    "Financial turnover statements",
                ],
            }


definition_instance = SummaryAgent()
