import logging
import json
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

import models
from services.ai_gemini import ask_llm
from sse import sse_manager
from workers.eligibility import run_async
from notifications.email_service import send_email
from notifications.templates import (
    render_high_match_email,
    render_medium_match_email,
    render_risk_email,
    render_deadline_email,
)

logger = logging.getLogger("tenderai.notifications.manager")


class NotificationManager:
    @staticmethod
    def compile_evidence(
        event_type: str, eligibility_result: dict, score_result: int, tender_data: dict
    ) -> tuple[str, list[str]]:
        """
        Compile deterministic evidence list directly from matching outcomes without using AI.
        """
        evidence = []
        trigger_reason = ""

        financial_match = eligibility_result.get("financial_match") or {}
        technical_match = eligibility_result.get("technical_match") or {}
        experience_match = eligibility_result.get("experience_match") or {}
        location_match = eligibility_result.get("location_match") or {}
        msme_advantage = eligibility_result.get("msme_advantage") or {}

        if event_type == "HIGH_MATCH":
            trigger_reason = "score >= 80 and eligibility == 'eligible'"
            evidence.append(
                f"Tender Suitability Score of {score_result}/100 meets high-match standard."
            )
            evidence.append("Eligibility verdict evaluated as ELIGIBLE.")
            if financial_match.get("status") == "pass":
                evidence.append(
                    f"Financial: {financial_match.get('details', 'Turnover requirements satisfied.')}"
                )
            if technical_match.get("status") == "pass":
                evidence.append(
                    f"Technical: {technical_match.get('details', 'Technical capabilities matched.')}"
                )
            if experience_match.get("status") == "pass":
                evidence.append(
                    f"Experience: {experience_match.get('details', 'Past projects demonstrate required capability.')}"
                )
            if location_match.get("status") == "pass":
                evidence.append(
                    f"Location: {location_match.get('details', 'Operational coverage aligns with tender location.')}"
                )
            if msme_advantage.get("applicable"):
                evidence.append("MSME benefits and exemptions apply to this bid.")

        elif event_type == "MEDIUM_MATCH":
            trigger_reason = "60 <= score < 80"
            evidence.append(
                f"Tender Suitability Score of {score_result}/100 indicates medium suitability."
            )
            evidence.append(
                f"Eligibility Status: {eligibility_result.get('eligibility', 'partially_eligible').upper()}"
            )
            if financial_match.get("status"):
                evidence.append(
                    f"Financial status: {financial_match.get('status').upper()} ({financial_match.get('details', '')})"
                )
            if technical_match.get("status"):
                evidence.append(
                    f"Technical status: {technical_match.get('status').upper()} ({technical_match.get('details', '')})"
                )
            if experience_match.get("status"):
                evidence.append(
                    f"Experience status: {experience_match.get('status').upper()} ({experience_match.get('details', '')})"
                )

        elif event_type == "RISK_ALERT":
            trigger_reason = "eligibility == 'not_eligible' or high_risk_count > 0"
            if eligibility_result.get("eligibility") == "not_eligible":
                evidence.append(
                    "Compliance Gap: Overall evaluation set to NOT ELIGIBLE."
                )

            if financial_match.get("status") == "fail":
                evidence.append(
                    f"Financial Gap: {financial_match.get('details', 'Turnover criteria failed.')}"
                )
            if technical_match.get("status") == "fail":
                evidence.append(
                    f"Technical Gap: {technical_match.get('details', 'Capability mismatch.')}"
                )
            if experience_match.get("status") == "fail":
                evidence.append(
                    f"Experience Gap: {experience_match.get('details', 'Insufficient past project values.')}"
                )
            if location_match.get("status") == "fail":
                evidence.append(
                    f"Location Gap: {location_match.get('details', 'Tender is outside coverage area.')}"
                )

        elif event_type == "DEADLINE_ALERT":
            trigger_reason = "deadline <= 7 days"
            deadline_str = tender_data.get("deadline") or "Not specified"
            evidence.append(f"Submission deadline is {deadline_str}.")
            # Calculate days remaining
            try:
                deadline_dt = datetime.fromisoformat(deadline_str)
                days_rem = (
                    deadline_dt.replace(tzinfo=None)
                    - datetime.utcnow().replace(tzinfo=None)
                ).days
                evidence.append(
                    f"Only {days_rem} days remaining until submission window closes."
                )
            except Exception:
                evidence.append("Submission window closing within 7 days.")

        return trigger_reason, evidence

    @staticmethod
    def calculate_priority(event_type: str, eligibility_result: dict) -> str:
        """
        Calculate notification priority and escalate to CRITICAL if specific gaps are identified.
        """
        # Base mapping
        priority_map = {
            "HIGH_MATCH": "MEDIUM",
            "MEDIUM_MATCH": "LOW",
            "DEADLINE_ALERT": "HIGH",
            "RISK_ALERT": "HIGH",
        }
        priority = priority_map.get(event_type, "MEDIUM")

        # Promote to CRITICAL if eligibility is not_eligible, financial fails, or certification is missing
        financial_match = eligibility_result.get("financial_match") or {}
        technical_match = eligibility_result.get("technical_match") or {}

        has_missing_cert = False
        tech_details = str(technical_match.get("details", "")).lower()
        if technical_match.get("status") == "fail" and any(
            x in tech_details for x in ["certif", "iso", "gst", "licens", "missing"]
        ):
            has_missing_cert = True

        if event_type == "RISK_ALERT":
            if (
                eligibility_result.get("eligibility") == "not_eligible"
                or financial_match.get("status") == "fail"
                or has_missing_cert
            ):
                priority = "CRITICAL"
                logger.info(
                    "Escalating RISK_ALERT notification to CRITICAL due to major compliance/financial gap."
                )

        return priority

    @classmethod
    def send_notification_manager(
        cls,
        db: Session,
        event_type: str,
        company_data: dict,
        tender_data: dict,
        eligibility_result: dict,
        score_result: int,
    ) -> bool:

        logger.info("=== NOTIFICATION MANAGER STARTED ===")
        logger.info(f"event_type={event_type}")
        logger.info(f"company_data={company_data}")
        logger.info(f"tender_data={tender_data}")

        """
        Orchestrates deduplication, throttling, audit logging, database write, HTML compilation and dispatch.
        """
        # Resolve company and tender records from DB
        from sqlalchemy import func

        company = (
            db.query(models.Company)
            .filter(
                func.lower(models.Company.name)
                == func.lower(company_data.get("name", ""))
            )
            .first()
        )
        tender = (
            db.query(models.Tender)
            .filter(models.Tender.tender_id == tender_data.get("tender_id"))
            .first()
        )

        if not company or not tender:
            logger.error(
                f"Cannot process notification. Company found: {bool(company)}, Tender found: {bool(tender)}"
            )
            return False

        # ✅ ADD THIS BLOCK — enrich tender_data from DB so templates never get None

        raw_title = tender.title or ""
        # Strip upload prefix noise from document analysis titles
        if raw_title.startswith("Analyzed:"):
            raw_title = (
                raw_title.split("_", 2)[-1]
                .replace("_", " ")
                .replace(".pdf", "")
                .strip()
            )

        tender_data = {
            "tender_id": tender.tender_id,
            "title": tender.title or "Untitled Tender",
            "department": getattr(tender, "department", None) or "Not specified",
            "location": getattr(tender, "location", None) or "Not specified",
            "value": getattr(tender, "value", None) or "Not specified",
            "deadline": str(tender.deadline) if tender.deadline else "Not specified",
            "description": getattr(tender, "description", None) or "",
            "category": getattr(tender, "category", None) or "",
        }

        company_id = company.id
        tender_id = tender.id

        # 1. DEDUPLICATION: check if notification with same type, tender, and company already exists
        existing_notif = (
            db.query(models.Notification)
            .filter(
                models.Notification.company_id == company_id,
                models.Notification.tender_id == tender_id,
                models.Notification.type == event_type,
            )
            .first()
        )

        if existing_notif:
            logger.info(
                f"Skipping duplicate notification: Type: {event_type}, Tender: {tender_id}, Company: {company_id}"
            )
            return True

        # 2. Compile evidence list and trigger reason deterministically
        trigger_reason, evidence_list = cls.compile_evidence(
            event_type, eligibility_result, score_result, tender_data
        )

        # 3. Determine priority and promotion
        priority = cls.calculate_priority(event_type, eligibility_result)

        # 4. Generate AI summaries for context inside email templates usingGemini/Groq
        why_matches = ""
        recommended_action = ""
        risk_summary = ""

        ai_prompt = f"""
        Analyze this tender match result and generate short, professional text blocks for a bid team notification email:
        - Why it matches (2 sentences max)
        - Recommended action (2 sentences max)
        - Risk summary (2 sentences max)

        COMPANY: {company_data.get("name")}
        TENDER: {tender_data.get("title")}
        SUITABILITY SCORE: {score_result}/100
        ELIGIBILITY: {eligibility_result.get("eligibility")}
        DETERMINISTIC EVIDENCE: {json.dumps(evidence_list)}

        Respond in JSON with EXACTLY this structure:
        {{
            "why_this_tender_matches": "...",
            "recommended_action": "...",
            "risk_summary": "..."
        }}
        """

        try:
            ai_res = json.loads(ask_llm(ai_prompt, json_mode=True))
            why_matches = ai_res.get("why_this_tender_matches", "")
            recommended_action = ai_res.get("recommended_action", "")
            risk_summary = ai_res.get("risk_summary", "")
        except Exception as e:
            logger.warning(
                f"LLM summaries generation failed: {str(e)}. Using fallback deterministic texts."
            )

        # Fallback values
        if not why_matches:
            why_matches = f"This tender matches your profile with a score of {score_result}/100. Key areas: {', '.join(evidence_list[:2])}."
        if not recommended_action:
            recommended_action = "Initiate formal review of the compliance specifications and prepare submission documents."
        if not risk_summary:
            risk_summary = "Review technical credentials and turnover terms. Identify potential compliance hurdles."

        # Compile Title and Message
        title = ""
        message = ""
        if event_type == "HIGH_MATCH":
            title = f"🚀 High-Match Tender Opportunity Found ({score_result}/100)"
            message = f"Strong tender opportunity matched. Score: {score_result}/100. Rationale: {why_matches}"
        elif event_type == "MEDIUM_MATCH":
            title = f"📋 Tender Requires Review ({score_result}/100)"
            message = f"Moderate match tender requires human review. Score: {score_result}/100. Action: {recommended_action}"
        elif event_type == "RISK_ALERT":
            title = (
                "🚨 CRITICAL Tender Risk Alert"
                if priority == "CRITICAL"
                else "🚨 Tender Risk Alert"
            )
            message = f"Match risk alert triggered. Severity: {priority}. Gaps: {', '.join(evidence_list)}. Mitigation: {recommended_action}"
        elif event_type == "DEADLINE_ALERT":
            title = "⏰ Tender Deadline Approaching"
            message = f"Submission window closes shortly. Checklist: {', '.join(evidence_list)}"

        # Save metadata block
        metadata_payload = {
            "why_this_tender_matches": why_matches,
            "recommended_action": recommended_action,
            "risk_summary": risk_summary,
            "trigger_reason": trigger_reason,
            "evidence": evidence_list,
        }

        # 5. DB Persistence: Store notification in database
        new_notif = models.Notification(
            company_id=company_id,
            tender_id=tender_id,
            type=event_type,
            priority=priority,
            title=title,
            message=message,
            notification_metadata=metadata_payload,
            is_read=False,
        )
        db.add(new_notif)
        db.flush()  # Populate the ID

        # 6. Audit Logging: Save exact trigger reason in audit logs
        audit_details = {
            "reason": trigger_reason,
            "evidence": evidence_list,
            "priority": priority,
            "score": score_result,
            "eligibility": eligibility_result.get("eligibility"),
        }

        # Log event name as requested: notification_created
        logger.info(
            f"[notification_created] Generated alert ID: {new_notif.id} for Tender ID: {tender_id}, Company ID: {company_id}, Type: {event_type}, Priority: {priority}"
        )

        new_audit = models.AuditLog(
            user_id=company.user_id,
            action="notification_created",
            details=audit_details,
        )
        db.add(new_audit)
        db.commit()

        # 7. THROTTLING Check: Check if an email for the same tender and type was sent within the past 24 hours
        # Fetch recent email audit logs and filter in Python for maximum compatibility
        one_day_ago = datetime.utcnow() - timedelta(hours=24)
        recent_emails = (
            db.query(models.AuditLog)
            .filter(
                models.AuditLog.user_id == company.user_id,
                models.AuditLog.action == "email_sent",
                models.AuditLog.created_at >= one_day_ago,
            )
            .all()
        )

        email_throttled = False
        for log in recent_emails:
            details = log.details or {}
            if (
                str(details.get("tender_id")) == str(tender_id)
                and str(details.get("type")) == event_type
            ):
                email_throttled = True
                break

        if email_throttled:
            logger.info(
                f"Email notifications throttled: Type {event_type} already sent within 24 hours for Tender ID: {tender_id}"
            )

        # 8. Send Email if not throttled
        email_sent_successfully = False
        if not email_throttled:
            # Fetch recipient user email
            user = (
                db.query(models.User).filter(models.User.id == company.user_id).first()
            )
            if user and user.email:
                html_body = ""
                if event_type == "HIGH_MATCH":
                    html_body = render_high_match_email(
                        company_name=str(company.name or ""),
                        tender={
                            k: (str(v) if v is not None else "Not specified")
                            for k, v in tender_data.items()
                        },
                        score=score_result,
                        eligibility_verdict=str(
                            eligibility_result.get("eligibility") or "eligible"
                        ),
                        why_matches=str(why_matches or ""),
                        recommended_action=str(recommended_action or ""),
                        evidence=evidence_list or [],
                    )
                elif event_type == "MEDIUM_MATCH":
                    html_body = render_medium_match_email(
                        company_name=str(company.name or ""),
                        tender={
                            k: (str(v) if v is not None else "Not specified")
                            for k, v in tender_data.items()
                        },
                        score=score_result,
                        eligibility_verdict=str(
                            eligibility_result.get("eligibility")
                            or "partially_eligible"
                        ),
                        why_matches=str(why_matches or ""),
                        recommended_action=str(recommended_action or ""),
                        evidence=evidence_list or [],
                    )
                elif event_type == "RISK_ALERT":
                    html_body = render_risk_email(
                        company_name=str(company.name or ""),
                        tender={
                            k: (str(v) if v is not None else "Not specified")
                            for k, v in tender_data.items()
                        },
                        priority=str(priority or "HIGH"),
                        risk_summary=str(risk_summary or ""),
                        recommended_action=str(recommended_action or ""),
                        evidence=evidence_list or [],
                    )
                elif event_type == "DEADLINE_ALERT":
                    checklist = eligibility_result.get("checklist", {}).get(
                        "submission_checklist", []
                    )
                    if not checklist:
                        checklist = [
                            "Valid registration proof",
                            "Financial balance sheets",
                            "MSME Certificate",
                        ]
                    html_body = render_deadline_email(
                        company_name=str(company.name or ""),
                        tender={
                            k: (str(v) if v is not None else "Not specified")
                            for k, v in tender_data.items()
                        },
                        days_remaining=7,
                        checklist=checklist,
                    )

                # Send email via service
                email_sent_successfully = send_email(
                    to_email=user.email,
                    subject=title,
                    html_content=html_body,
                    tender_id=tender_id,
                    company_id=company_id,
                )

                if email_sent_successfully:
                    # Write audit log for email sent
                    email_audit = models.AuditLog(
                        user_id=company.user_id,
                        action="email_sent",
                        details={
                            "tender_id": tender_id,
                            "company_id": company_id,
                            "type": event_type,
                        },
                    )
                    db.add(email_audit)
                    db.commit()

        # 9. SSE Broadcasting: send notification over Server-Sent Events to keep dashboard synchronized
        sse_payload = {
            "id": new_notif.id,
            "company_id": new_notif.company_id,
            "tender_id": new_notif.tender_id,
            "type": new_notif.type,
            "priority": new_notif.priority,
            "title": new_notif.title,
            "message": new_notif.message,
            "metadata": new_notif.notification_metadata,
            "is_read": new_notif.is_read,
            "created_at": new_notif.created_at.isoformat(),
        }
        run_async(
            sse_manager.publish("dashboard_events", "notification_added", sse_payload)
        )

        return True
