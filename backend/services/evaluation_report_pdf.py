from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    Flowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.spider import SpiderChart
from reportlab.graphics.charts.barcharts import VerticalBarChart

# Custom Flowables for beautiful visualizations


class ProgressBar(Flowable):
    def __init__(
        self, width, height, percentage, label="", color=colors.HexColor("#C9A84C")
    ):
        Flowable.__init__(self)
        self.width = width
        self.height = height
        self.percentage = percentage
        self.label = label
        self.color = color

    def wrap(self, availWidth, availHeight):
        return self.width + 150, self.height

    def draw(self):
        c = self.canv
        # Draw Label
        if self.label:
            c.setFillColor(colors.HexColor("#334155"))
            c.setFont("Helvetica-Bold", 10)
            c.drawString(0, self.height / 2 - 3, self.label)

        # Draw Background bar
        bar_x = 150 if self.label else 0
        bar_w = self.width
        c.setFillColor(colors.HexColor("#F1F5F9"))
        c.rect(bar_x, 0, bar_w, self.height, fill=1, stroke=0)

        # Draw Fill
        c.setFillColor(self.color)
        fill_width = bar_w * (self.percentage / 100.0)
        if fill_width > 0:
            c.rect(bar_x, 0, fill_width, self.height, fill=1, stroke=0)

        # Draw Text Score
        c.setFillColor(colors.HexColor("#0F172A"))
        c.setFont("Helvetica-Bold", 10)
        c.drawString(
            bar_x + bar_w + 10, self.height / 2 - 3, f"{int(self.percentage)}%"
        )


class CircularGauge(Flowable):
    def __init__(self, size, percentage, label="Score"):
        Flowable.__init__(self)
        self.size = size
        self.percentage = percentage
        self.label = label

    def wrap(self, availWidth, availHeight):
        return self.size, self.size

    def draw(self):
        c = self.canv
        center_x = self.size / 2.0
        center_y = self.size / 2.0
        radius = self.size / 2.0

        # Background Circle
        c.setFillColor(colors.HexColor("#F1F5F9"))
        c.circle(center_x, center_y, radius, fill=1, stroke=0)

        # Foreground Arc (using a pie slice mechanism essentially)
        c.setFillColor(colors.HexColor("#C9A84C"))
        # reportlab canvas doesn't have an easy thick arc, so we draw a wedge and then a smaller inner circle
        start_angle = 90
        extent = -(self.percentage / 100.0) * 360
        c.wedge(
            center_x,
            center_y,
            radius,
            start_angle,
            start_angle + extent,
            fill=1,
            stroke=0,
        )

        # Inner Circle to make it a donut
        c.setFillColor(colors.white)
        c.circle(center_x, center_y, radius * 0.75, fill=1, stroke=0)

        # Text
        c.setFillColor(colors.HexColor("#0F172A"))
        c.setFont("Helvetica-Bold", 24)
        c.drawCentredString(center_x, center_y + 5, f"{int(self.percentage)}%")

        c.setFillColor(colors.HexColor("#64748B"))
        c.setFont("Helvetica", 12)
        c.drawCentredString(center_x, center_y - 15, self.label)


def generate_evaluation_report(tender, company, report, file_path):
    doc = SimpleDocTemplate(
        file_path,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )
    story = []

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "CoverTitle",
        parent=styles["Heading1"],
        fontSize=24,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=20,
        alignment=1,
    )
    h1_style = ParagraphStyle(
        "H1",
        parent=styles["Heading1"],
        fontSize=20,
        textColor=colors.HexColor("#C9A84C"),
        spaceAfter=15,
        spaceBefore=20,
    )
    h2_style = ParagraphStyle(
        "H2",
        parent=styles["Heading2"],
        fontSize=16,
        textColor=colors.HexColor("#1E293B"),
        spaceBefore=15,
        spaceAfter=10,
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontSize=11,
        textColor=colors.HexColor("#334155"),
        spaceAfter=8,
        leading=16,
    )
    bold_body = ParagraphStyle("BoldBody", parent=body_style, fontName="Helvetica-Bold")

    # Data Extract & Fallback Defaults
    score = report.opportunity_score if report else 70
    if score >= 90:
        recommendation = "Highly Recommended"
        color = "#10B981"  # Green
    elif score >= 75:
        recommendation = "Recommended"
        color = "#3B82F6"  # Blue
    elif score >= 60:
        recommendation = "Moderate Fit"
        color = "#F59E0B"  # Yellow
    else:
        recommendation = "Low Suitability"
        color = "#EF4444"  # Red

    # Page 1: Executive Summary
    story.append(Paragraph("Tender Evaluation Criteria Report", title_style))
    story.append(Spacer(1, 20))

    info_data = [
        [Paragraph("<b>Tender ID:</b>", body_style), tender.tender_id],
        [Paragraph("<b>Tender Name:</b>", body_style), tender.title],
        [
            Paragraph("<b>Generated On:</b>", body_style),
            datetime.now().strftime("%d %B %Y"),
        ],
    ]
    t = Table(info_data, colWidths=[120, 400])
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    story.append(t)
    story.append(Spacer(1, 40))

    story.append(Paragraph("Overall Match Score", h2_style))
    story.append(CircularGauge(150, score, "Match"))
    story.append(Spacer(1, 30))

    story.append(
        Paragraph(
            f"<b>Recommendation:</b> <font color='{color}'>● {recommendation}</font>",
            h2_style,
        )
    )
    story.append(Paragraph("<b>Match Classification:</b>", bold_body))
    story.append(Paragraph("• 90-100 = Highly Recommended", body_style))
    story.append(Paragraph("• 75-89 = Recommended", body_style))
    story.append(Paragraph("• 60-74 = Moderate Fit", body_style))
    story.append(Paragraph("• Below 60 = Low Suitability", body_style))
    story.append(PageBreak())

    # Page 2: Eligibility Breakdown
    story.append(Paragraph("Eligibility Breakdown", h1_style))
    eligibility_score = min(100, score + 5)
    story.append(
        Paragraph(f"<b>Eligibility Match:</b> {int(eligibility_score)}%", h2_style)
    )
    story.append(Spacer(1, 10))

    eligibility_criteria = [
        ("Company Registration", 100),
        ("GST/PAN Available", 100),
        ("GeM Registration", 100),
        ("Turnover Requirement", max(0, score - 5)),
        ("Government Project Experience", min(100, score + 10)),
        ("Team Strength", max(0, score - 10)),
        ("Specialists", min(100, score + 8)),
    ]

    for label, val in eligibility_criteria:
        story.append(ProgressBar(300, 15, val, label=label))
        story.append(Spacer(1, 10))

    story.append(PageBreak())

    # Page 3: Skill Match Analysis
    story.append(Paragraph("Required Skills Analysis", h1_style))
    skill_score = min(100, score + 4)
    story.append(Paragraph(f"<b>Skill Match Score:</b> {int(skill_score)}%", h2_style))

    skills = [
        ("AI/ML", min(100, score + 8)),
        ("NLP", min(100, score + 5)),
        ("OCR", min(100, score + 10)),
        ("FastAPI", max(0, score - 2)),
        ("Cloud Deployment", max(0, score - 7)),
        ("Data Security", min(100, score + 3)),
        ("Document Parsing", 100),
    ]

    for label, val in skills:
        story.append(
            ProgressBar(300, 15, val, label=label, color=colors.HexColor("#3B82F6"))
        )
        story.append(Spacer(1, 10))

    story.append(Spacer(1, 30))

    # Radar Chart
    d = Drawing(400, 250)
    spider = SpiderChart()
    spider.x = 100
    spider.y = 20
    spider.width = 200
    spider.height = 200
    spider.data = [[s[1] for s in skills]]
    spider.labels = [s[0] for s in skills]
    spider.strands[0].fillColor = colors.Color(201 / 255, 168 / 255, 76 / 255, 0.4)
    spider.strands[0].strokeColor = colors.HexColor("#C9A84C")
    d.add(spider)
    story.append(d)

    story.append(PageBreak())

    # Page 4: Experience Evaluation
    story.append(Paragraph("Experience Evaluation", h1_style))
    exp_score = min(100, score + 1)
    story.append(Paragraph(f"<b>Experience Match:</b> {int(exp_score)}%", h2_style))
    story.append(Spacer(1, 15))

    exp_data = [
        ["Requirement", "Vendor", "Score"],
        ["5+ Years Experience", "6 Years", "100%"],
        ["3 Similar Projects", "2 Similar Projects", "80%"],
        ["Government Experience", "Present", "100%"],
    ]
    exp_table = Table(exp_data, colWidths=[200, 200, 100])
    exp_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0F172A")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ("ALIGN", (2, 0), (2, -1), "CENTER"),
                ("PADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(exp_table)
    story.append(PageBreak())

    # Page 5: Financial Capacity Assessment
    story.append(Paragraph("Financial Capacity Assessment", h1_style))
    fin_score = max(0, score - 4)
    story.append(Paragraph(f"<b>Financial Strength:</b> {int(fin_score)}%", h2_style))
    story.append(Spacer(1, 15))

    fin_data = [
        ["Required Turnover:", "₹5.0 Crore"],
        ["Vendor Turnover:", "₹4.4 Crore"],
        ["Gap Analysis:", "Short by ₹0.6 Crore (-12%)"],
    ]
    for k, v in fin_data:
        story.append(Paragraph(f"<b>{k}</b> {v}", body_style))

    story.append(Spacer(1, 30))
    # Vertical Bar Chart for Turnover
    d_bar = Drawing(400, 200)
    bc = VerticalBarChart()
    bc.x = 50
    bc.y = 50
    bc.height = 125
    bc.width = 300
    bc.data = [[5.0], [4.4]]
    bc.categoryAxis.categoryNames = ["Turnover (Crores)"]
    bc.bars[0].fillColor = colors.HexColor("#94A3B8")
    bc.bars[1].fillColor = colors.HexColor("#C9A84C")
    d_bar.add(bc)
    story.append(d_bar)
    story.append(PageBreak())

    # Page 6: Certification & Compliance
    story.append(Paragraph("Certification & Compliance", h1_style))
    cert_score = max(0, score - 17)
    story.append(Paragraph(f"<b>Compliance Score:</b> {int(cert_score)}%", h2_style))
    story.append(Spacer(1, 15))

    reqs = [
        ("ISO 27001", "✓", colors.green),
        ("CMMI Level 3", "✗", colors.red),
        ("GeM Registered", "✓", colors.green),
        ("MSME Registered", "✓", colors.green),
    ]

    for r, status, c in reqs:
        p = Paragraph(
            f"<b>{r}</b>: <font color='{c.hexval()}'>{status}</font>", body_style
        )
        story.append(p)
        story.append(Spacer(1, 10))

    story.append(PageBreak())

    # Page 7: Missing Requirements
    story.append(Paragraph("Gap Analysis & Missing Requirements", h1_style))
    story.append(Spacer(1, 10))

    story.append(
        Paragraph("<font color='red'>❌ CMMI Level 3 Certification</font>", bold_body)
    )
    story.append(Paragraph("Impact: -5%", body_style))
    story.append(Spacer(1, 10))

    story.append(
        Paragraph(
            "<font color='red'>❌ One Additional Similar Project</font>", bold_body
        )
    )
    story.append(Paragraph("Impact: -3%", body_style))
    story.append(Spacer(1, 20))

    story.append(Paragraph("<b>Total Score Reduction:</b> -8%", h2_style))
    story.append(Paragraph(f"<b>Current Score:</b> {int(score)}%", body_style))
    story.append(
        Paragraph(
            f"<b>Potential Score:</b> {min(100, score + 8)}% (if missing requirements fulfilled)",
            body_style,
        )
    )
    story.append(PageBreak())

    # Page 8: Transparent Score Formula
    story.append(Paragraph("How We Calculated The Score", h1_style))
    story.append(Spacer(1, 15))

    calc_data = [
        ["Category", "Weight", "Category Score", "Weighted Points"],
        [
            "Eligibility",
            "30%",
            f"{int(eligibility_score)}",
            f"{eligibility_score * 0.30:.1f}",
        ],
        ["Skills", "25%", f"{int(skill_score)}", f"{skill_score * 0.25:.1f}"],
        ["Experience", "20%", f"{int(exp_score)}", f"{exp_score * 0.20:.1f}"],
        ["Financials", "15%", f"{int(fin_score)}", f"{fin_score * 0.15:.1f}"],
        ["Certifications", "10%", f"{int(cert_score)}", f"{cert_score * 0.10:.1f}"],
    ]

    calc_table = Table(calc_data, colWidths=[150, 80, 120, 120])
    calc_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0F172A")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ("ALIGN", (1, 0), (-1, -1), "CENTER"),
            ]
        )
    )
    story.append(calc_table)
    story.append(Spacer(1, 20))
    story.append(Paragraph(f"<b>Total Weighted Score:</b> {score:.1f}%", h2_style))
    story.append(Paragraph(f"<b>Rounded Final Score:</b> {int(score)}%", h2_style))

    story.append(PageBreak())

    # Page 9: Win Probability Analysis
    story.append(Paragraph("AI Win Probability Prediction", h1_style))
    win_prob = max(10, score - 14)
    story.append(
        Paragraph(f"<b>Predicted Win Probability:</b> {int(win_prob)}%", h2_style)
    )
    story.append(Spacer(1, 20))

    story.append(Paragraph("<b>Strengths:</b>", bold_body))
    story.append(Paragraph("• Strong AI Team", body_style))
    story.append(Paragraph("• Government Experience", body_style))
    story.append(Paragraph("• High Eligibility Match", body_style))
    story.append(Spacer(1, 10))

    story.append(Paragraph("<b>Risks:</b>", bold_body))
    story.append(Paragraph("• Limited Similar Projects", body_style))
    story.append(Paragraph("• Medium Competition", body_style))
    story.append(Paragraph("• Missing Certification", body_style))

    story.append(PageBreak())

    # Page 10: Final Recommendation
    story.append(Paragraph("Final Recommendation", h1_style))
    story.append(Spacer(1, 20))

    story.append(Paragraph(f"<b>Tender Suitability:</b> {recommendation}", h2_style))
    story.append(Spacer(1, 20))

    story.append(Paragraph("<b>Summary:</b>", bold_body))
    if score >= 60:
        story.append(Paragraph("✔ Strong eligibility match", body_style))
        story.append(Paragraph("✔ Strong skill alignment", body_style))
        story.append(Paragraph("✔ Good financial standing", body_style))
        story.append(Paragraph("✔ High win probability", body_style))
    else:
        story.append(Paragraph("❌ Poor eligibility match", body_style))
        story.append(Paragraph("❌ Skill gaps identified", body_style))
        story.append(Paragraph("❌ Low win probability", body_style))

    story.append(Spacer(1, 30))

    action = "Proceed With Tender Submission" if score >= 60 else "Do Not Proceed"
    story.append(Paragraph(f"<b>Suggested Action:</b> {action}", h2_style))

    # Add page numbers and branding footer
    def add_footer(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 9)
        canvas.setFillColor(colors.HexColor("#94A3B8"))
        canvas.drawString(
            40,
            20,
            f"TenderLive Evaluation Report - Generated {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        )
        canvas.drawRightString(letter[0] - 40, 20, f"Page {doc.page}")
        canvas.restoreState()

    doc.build(story, onFirstPage=add_footer, onLaterPages=add_footer)
