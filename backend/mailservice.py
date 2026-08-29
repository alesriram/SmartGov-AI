"""SMTP acknowledgement emails for complaint submissions with rich HTML formatting and Department Head details."""
import logging
import os
import smtplib
from email.message import EmailMessage
from email.utils import parseaddr

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

DEPARTMENT_HEADS = {
    "roads": {
        "name": "Dr. Rajeshwar Rao",
        "title": "Chief Superintending Engineer (Roads & Bridges)",
        "email": "rajeshwar.rao@smartcity.gov",
        "phone": "+91 (040) 2345-8711",
        "office": "Engineering Wing, 2nd Floor, Civic Infrastructure Complex, Hyderabad",
    },
    "sanitation": {
        "name": "Smt. Sunitha Reddy, IAS",
        "title": "Additional Commissioner (Solid Waste & Sanitation Management)",
        "email": "sunitha.reddy@smartcity.gov",
        "phone": "+91 (040) 2345-8722",
        "office": "Environment & Swachh Directorate, 4th Floor, Municipal HQ, Hyderabad",
    },
    "water_supply": {
        "name": "Er. K. V. Ramanathan",
        "title": "Director of Water Operations & Sewerage Management",
        "email": "kv.ramanathan@smartcity.gov",
        "phone": "+91 (040) 2345-8733",
        "office": "Water Works Bhavan, Zonal Khairatabad Division, Hyderabad",
    },
    "electricity": {
        "name": "Sri. Mohammed Arshad",
        "title": "Chief Electrical Inspector & Urban Lighting Lead",
        "email": "m.arshad@smartcity.gov",
        "phone": "+91 (040) 2345-8744",
        "office": "Electrical Distribution Cell, Power Sub-Station Circle, Hyderabad",
    },
    "traffic": {
        "name": "Vikram Simha, IPS",
        "title": "Deputy Commissioner of Police (Traffic & Intelligent Mobility)",
        "email": "vikram.traffic@smartcity.gov",
        "phone": "+91 (040) 2345-8755",
        "office": "Traffic Command & Control Centre, Nampally, Hyderabad",
    },
    "public_health": {
        "name": "Dr. Priya Nambiar",
        "title": "Chief Municipal Health Officer (Urban Health & Epidemic Prevention)",
        "email": "priya.health@smartcity.gov",
        "phone": "+91 (040) 2345-8766",
        "office": "Public Health Directorate, Medical Complex, Himayatnagar, Hyderabad",
    },
    "general": {
        "name": "Sri. Anand Vardhan",
        "title": "Joint Secretary (Public Grievance Redressal & Citizen Care)",
        "email": "anand.grievance@smartcity.gov",
        "phone": "+91 (040) 2345-8777",
        "office": "Citizen Facilitation Centre, Ground Floor, Central Secretariat, Hyderabad",
    },
}


def get_department_head(category: str | None) -> dict:
    cat = (category or "general").lower().strip()
    return DEPARTMENT_HEADS.get(cat, DEPARTMENT_HEADS["general"])


def _is_email_address(value: str | None) -> bool:
    _, address = parseaddr(value or "")
    return "@" in address and "." in address.rsplit("@", 1)[-1]


def _build_html_email(complaint, head: dict) -> str:
    """Creates a modern, stylish, and responsive HTML email template for the citizen."""
    cid = complaint.id
    citizen_name = complaint.citizen_name or "Valued Citizen"
    category = (complaint.category or "General Grievance").replace("_", " ").title()
    priority = (complaint.priority.value if hasattr(complaint.priority, "value") else complaint.priority or "Medium").capitalize()
    dept_name = complaint.department.name if getattr(complaint, "department", None) else f"{category} Department"
    address = complaint.address or "Municipal Ward Zone, Hyderabad"
    description = complaint.description or "Civic issue reported via citizen portal."
    ai_response = complaint.ai_response or (
        f"Your grievance has been validated and queued for field action by the {dept_name}."
    )

    priority_color = "#e11d48" if priority.lower() == "critical" else "#d97706" if priority.lower() == "high" else "#0284c7"
    priority_bg = "#ffe4e6" if priority.lower() == "critical" else "#fef3c7" if priority.lower() == "high" else "#e0f2fe"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SmartGov Complaint #{cid} Registered</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.07); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #094753 0%, #0ea7a8 100%); padding: 36px 32px 30px; text-align: center;">
              <div style="display: inline-block; background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.3); border-radius: 50px; padding: 6px 16px; margin-bottom: 12px;">
                <span style="color: #ffffff; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">🏛️ SmartGov Civic Intelligence</span>
              </div>
              <h1 style="color: #ffffff; margin: 0 0 8px; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">Grievance Registration Confirmed</h1>
              <p style="color: #e0fafa; margin: 0; font-size: 14px; opacity: 0.95;">Official acknowledgement &amp; departmental dispatch tracking</p>
              
              <!-- Ticket Badge -->
              <div style="display: inline-block; margin-top: 18px; background: #ffffff; border-radius: 10px; padding: 8px 20px; box-shadow: 0 4px 14px rgba(0,0,0,0.15);">
                <span style="color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase;">Tracking Ticket Number:</span>
                <span style="color: #0b5c6d; font-size: 18px; font-weight: 800; font-family: monospace; margin-left: 6px;">#{cid}</span>
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 32px 24px;">
              <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px; color: #334155;">
                Dear <strong>{citizen_name}</strong>,
              </p>
              <p style="font-size: 14px; line-height: 1.6; margin: 0 0 24px; color: #475569;">
                Thank you for being an active participant in our city's well-being. Your grievance has been analyzed by our <strong>Computer Vision &amp; Multi-Agent Triage Engine</strong> and has been successfully routed to the responsible civic authority.
              </p>

              <!-- Incident Details Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #64748b; width: 40%;">Category:</td>
                        <td style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 700;">{category}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Assigned Priority:</td>
                        <td style="padding: 6px 0; font-size: 13px;">
                          <span style="background-color: {priority_bg}; color: {priority_color}; padding: 3px 10px; border-radius: 20px; font-weight: 700; font-size: 11px; text-transform: uppercase;">
                            {priority} Urgency
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Location / Ward:</td>
                        <td style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 600;">📍 {address}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Assigned Department:</td>
                        <td style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 700;">🏛️ {dept_name}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Target Resolution SLA:</td>
                        <td style="padding: 6px 0; font-size: 13px; color: #059669; font-weight: 700;">⏱️ Within 24–48 Hours</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Reported Summary Box -->
              <div style="background-color: #ffffff; border-left: 4px solid #0ea7a8; padding: 14px 18px; border-radius: 0 10px 10px 0; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
                <span style="font-size: 11px; font-weight: 700; color: #0ea7a8; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Citizen Grievance Recorded:</span>
                <p style="margin: 0; font-size: 13.5px; color: #334155; line-height: 1.5; font-style: italic;">"{description}"</p>
              </div>

              <!-- Automated AI Resolution Plan -->
              <div style="background-color: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
                <span style="font-size: 11px; font-weight: 800; color: #0d9488; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 6px;">🤖 Automated AI Action Plan:</span>
                <p style="margin: 0; font-size: 13px; color: #134e4a; line-height: 1.6;">{ai_response}</p>
              </div>

              <!-- DEPARTMENT HEAD & ESCALATION CARD -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #f8fafc 0%, #edf8f8 100%); border: 1.5px solid #bfe9ea; border-radius: 14px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px 22px;">
                    <div style="display: flex; align-items: center; margin-bottom: 8px;">
                      <span style="font-size: 11px; font-weight: 800; color: #094753; text-transform: uppercase; letter-spacing: 0.06em;">👔 Responsible Department Leadership &amp; Escalation Lead:</span>
                    </div>
                    
                    <h3 style="margin: 0 0 2px; font-size: 16px; font-weight: 800; color: #0f172a;">{head['name']}</h3>
                    <div style="font-size: 12.5px; color: #0ea7a8; font-weight: 700; margin-bottom: 12px;">{head['title']}</div>
                    
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 12.5px; color: #475569;">
                      <tr>
                        <td style="padding: 3px 0; width: 32%;">Direct Email:</td>
                        <td style="padding: 3px 0;"><a href="mailto:{head['email']}" style="color: #0284c7; text-decoration: none; font-weight: 600;">{head['email']}</a></td>
                      </tr>
                      <tr>
                        <td style="padding: 3px 0;">Official Helpline:</td>
                        <td style="padding: 3px 0; color: #0f172a; font-weight: 600;">{head['phone']}</td>
                      </tr>
                      <tr>
                        <td style="padding: 3px 0;">Zonal Office:</td>
                        <td style="padding: 3px 0; color: #475569;">{head['office']}</td>
                      </tr>
                    </table>

                    <p style="margin: 12px 0 0; font-size: 11px; color: #64748b; line-height: 1.4; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
                      ℹ️ For urgent field escalations regarding this ticket, you may directly reference <strong>Ticket #{cid}</strong> to the office above.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Action button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 16px;">
                <tr>
                  <td align="center">
                    <a href="http://localhost:5173" target="_blank" style="background: linear-gradient(135deg, #094753, #0ea7a8); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 14px rgba(14,167,168,0.3);">
                      Track Grievance Online →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="font-size: 12px; color: #64748b; margin: 0 0 6px;">
                SmartGov Urban Governance &amp; Grievance Redressal Cell
              </p>
              <p style="font-size: 11px; color: #94a3b8; margin: 0 0 10px;">
                24/7 Citizen Emergency Toll-Free: <strong>1800-425-SMART</strong> · Monitored via Automated AI Telemetry
              </p>
              <p style="font-size: 10px; color: #cbd5e1; margin: 0;">
                This is an automated operational notification. You are receiving this because you submitted a civic grievance.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def send_complaint_acknowledgement(complaint) -> bool:
    """Send a rich, stylish HTML acknowledgement with Department Head details."""
    recipient = complaint.citizen_contact
    if not _is_email_address(recipient):
        return False

    username = (os.getenv("SMTP_USERNAME") or os.getenv("EMAIL_USER") or "").strip()
    password = (os.getenv("SMTP_PASSWORD") or os.getenv("EMAIL_PASS") or "").strip()
    host = (os.getenv("SMTP_HOST") or ("smtp.gmail.com" if "@gmail.com" in username.lower() else "")).strip()
    sender = (os.getenv("SMTP_FROM") or username).strip()
    if not host or not sender:
        logger.info("SMTP is not configured; skipping complaint acknowledgement")
        return False

    head = get_department_head(getattr(complaint, "category", None))

    port = int(os.getenv("SMTP_PORT", "587"))
    use_ssl = os.getenv("SMTP_USE_SSL", "false").lower() == "true"
    subject = f"🏛️ [Ticket #{complaint.id}] Grievance Registered: {getattr(complaint, 'category', 'Civic Issue').replace('_', ' ').title()}"

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = sender
    message["To"] = recipient

    # Plain text version fallback
    plain_text = (
        f"SmartGov Civic Intelligence - Official Acknowledgement\n"
        f"----------------------------------------------------\n"
        f"Hello {complaint.citizen_name or 'Citizen'},\n\n"
        f"Your grievance has been registered successfully.\n\n"
        f"Ticket Number: #{complaint.id}\n"
        f"Category: {complaint.category or 'General'}\n"
        f"Priority: {complaint.priority.value if hasattr(complaint.priority, 'value') else complaint.priority}\n"
        f"Assigned Department: {complaint.department.name if getattr(complaint, 'department', None) else 'Municipal Department'}\n\n"
        f"--- DEPARTMENT LEADERSHIP & ESCALATION ---\n"
        f"Department Head: {head['name']}\n"
        f"Designation: {head['title']}\n"
        f"Official Email: {head['email']}\n"
        f"Helpline: {head['phone']}\n"
        f"Zonal Office: {head['office']}\n\n"
        f"Reported Issue: \"{complaint.description}\"\n\n"
        f"Our field teams will address your grievance in accordance with municipal SLAs.\n"
        f"24/7 Citizen Helpline: 1800-425-SMART\n"
    )
    message.set_content(plain_text)

    # HTML rich visual template
    html_content = _build_html_email(complaint, head)
    message.add_alternative(html_content, subtype="html")

    try:
        smtp_class = smtplib.SMTP_SSL if use_ssl else smtplib.SMTP
        logger.info("Attempting SMTP send for complaint %s to %s via %s:%s", complaint.id, recipient, host, port)
        with smtp_class(host, port, timeout=10) as smtp:
            smtp.ehlo()
            if not use_ssl:
                smtp.starttls()
                smtp.ehlo()
            if username and password:
                logger.info("SMTP login for complaint %s using %s", complaint.id, username)
                smtp.login(username, password)
            smtp.send_message(message)
        logger.info("SMTP acknowledgement sent successfully for complaint %s", complaint.id)
        return True
    except (OSError, smtplib.SMTPException, ValueError) as exc:
        logger.exception("Failed to send acknowledgement for complaint %s. Error: %s", complaint.id, exc)
        return False