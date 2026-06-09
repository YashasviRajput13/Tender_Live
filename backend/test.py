
from notifications.email_service import send_email

send_email(
    to_email="tomarashi1102@gmail.com",
    subject="SMTP Test",
    html_content="<h1>Hello from Tender Live</h1>",
    tender_id=1,
    company_id=1
)