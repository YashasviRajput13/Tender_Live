import os
import json
import logging
from typing import Dict, Any
from pypdf import PdfReader
from services.ai_gemini import ask_llm

logger = logging.getLogger(__name__)

class DocumentAgent:
    def extract_text_from_pdf(self, file_path: str, max_chars: int = 40000) -> str:
        """
        Extract text from PDF file up to max_chars limits to preserve LLM token usage.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
            
        logger.info(f"Extracting text from PDF: {file_path}")
        text_content = []
        try:
            reader = PdfReader(file_path)
            for i, page in enumerate(reader.pages):
                page_text = page.extract_text()
                if page_text:
                    text_content.append(page_text)
                
                # Check character threshold
                current_len = sum(len(t) for t in text_content)
                if current_len >= max_chars:
                    logger.info(f"Reached max character limit ({max_chars}) at page {i+1}.")
                    break
        except Exception as e:
            logger.error(f"Failed to read PDF file {file_path}: {str(e)}")
            raise e
            
        full_text = "\n".join(text_content)
        return full_text[:max_chars]

    def analyze_document(self, file_path: str) -> Dict[str, Any]:
        """
        Parse a tender PDF file and return structured qualification JSON.
        """
        try:
            text = self.extract_text_from_pdf(file_path)
            if not text.strip():
                raise ValueError("PDF text extraction returned empty content.")
                
            logger.info(f"Sending extracted text ({len(text)} chars) to Gemini for document analysis.")
            
            prompt = f"""
            You are a Document Intelligence Extraction Agent. Your task is to analyze the raw text extracted from a government or corporate tender PDF document and generate structured, typed JSON data outlining the core elements of the tender.

            RAW TENDER DOCUMENT TEXT:
            ---
            {text}
            ---

            Please extract and summarize:
            1. Detailed Scope of Work (What are they buying? What services are requested?)
            2. Technical Requirements (System specs, experience years, certifications needed)
            3. Financial Requirements (Turnover minimums, earnest money deposits (EMD), performance security)
            4. Qualification Criteria (Who is allowed to bid?)
            5. Key milestones and deadlines.

            Respond with a JSON object following EXACTLY this structure:
            {{
                "tender_title": "Title of the tender or 'Unknown'",
                "tender_id": "Tender Reference Number / Bid ID or 'Unknown'",
                "scope_of_work": "Comprehensive summary detailing the exact scope of services or goods requested.",
                "technical_requirements": [
                    "Required specification 1",
                    "Required specification 2"
                ],
                "financial_requirements": {{
                    "earnest_money_deposit": "EMD amount or 'Exempt'",
                    "min_annual_turnover": "Minimum turnover required or 'Not specified'",
                    "performance_security": "Performance bank guarantee details or 'Not specified'"
                }},
                "qualification_criteria": [
                    "Criterion 1 (e.g., must have active GST registration)",
                    "Criterion 2 (e.g., must not be blacklisted)"
                ],
                "deadlines": {{
                    "bid_submission": "Deadline date/time or 'Not specified'",
                    "pre_bid_meeting": "Pre-bid meeting details or 'Not specified'"
                }}
            }}
            """
            
            response_text = ask_llm(prompt, json_mode=True)
            return json.loads(response_text)
        except Exception as e:
            logger.error(f"Failed to analyze tender document PDF: {str(e)}")
            return {
                "tender_title": os.path.basename(file_path),
                "tender_id": "Manual-Upload-" + os.path.basename(file_path).split(".")[0],
                "scope_of_work": f"Failed to extract scope automatically. Reason: {str(e)}",
                "technical_requirements": ["Unable to parse technical items. Review PDF manually."],
                "financial_requirements": {
                    "earnest_money_deposit": "Not specified",
                    "min_annual_turnover": "Not specified",
                    "performance_security": "Not specified"
                },
                "qualification_criteria": ["Check standard bid qualifications manually."],
                "deadlines": {
                    "bid_submission": "Not specified",
                    "pre_bid_meeting": "Not specified"
                }
            }

definition_instance = DocumentAgent()
