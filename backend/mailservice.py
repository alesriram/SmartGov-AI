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


def _send_via_brevo_api(api_key: str, sender_email: str, recipient_email: str, bcc_email: str | None, subject: str, html_content: str, text_content: str) -> bool:
    """Dispatches email via Brevo HTTPS REST API (Port 443).
    Bypasses Render cloud outbound SMTP port restrictions (Errno 101).
    """
    import json
    import urllib.error
    import urllib.request

    url = "https://api.brevo.com/v3/smtp/email"
    payload = {
        "sender": {"name": "SmartGov Civic Intelligence", "email": sender_email or "smartgov.alerts@gmail.com"},
        "to": [{"email": recipient_email}],
        "subject": subject,
        "htmlContent": html_content,
        "textContent": text_content,
        "replyTo": {"email": sender_email}
    }
    if bcc_email and bcc_email.lower() != recipient_email.lower():
        payload["bcc"] = [{"email": bcc_email}]

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "api-key": api_key.strip(),
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "SmartGov-Civic/1.0"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            if resp.status in (200, 201):
                print(f"[mailservice] [SUCCESS] Brevo HTTPS API dispatched email to {recipient_email}!")
                return True
    except urllib.error.HTTPError as he:
        body = he.read().decode("utf-8", errors="ignore")
        print(f"[mailservice] [WARNING] Brevo API HTTP {he.code}: {body}")
    except Exception as exc:
        print(f"[mailservice] [WARNING] Brevo API call failed: {exc}")
    return False


def _send_via_resend_api(api_key: str, sender_email: str, recipient_email: str, bcc_email: str | None, subject: str, html_content: str, text_content: str) -> bool:
    """Dispatches email via Resend HTTPS REST API (Port 443).
    Bypasses Render cloud outbound SMTP port restrictions (Errno 101).
    """
    import json
    import urllib.error
    import urllib.request

    url = "https://api.resend.com/emails"
    from_sender = f"SmartGov Civic Intelligence <{sender_email}>" if ("@" in sender_email and "gmail.com" not in sender_email) else "SmartGov Civic Intelligence <onboarding@resend.dev>"
    payload = {
        "from": from_sender,
        "to": [recipient_email],
        "subject": subject,
        "html": html_content,
        "text": text_content,
    }
    if bcc_email and bcc_email.lower() != recipient_email.lower():
        payload["bcc"] = [bcc_email]

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {api_key.strip()}",
            "Content-Type": "application/json",
            "User-Agent": "SmartGov-Civic/1.0"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            if resp.status in (200, 201):
                print(f"[mailservice] [SUCCESS] Resend HTTPS API dispatched email to {recipient_email}!")
                return True
    except urllib.error.HTTPError as he:
        body = he.read().decode("utf-8", errors="ignore")
        print(f"[mailservice] [WARNING] Resend API HTTP {he.code}: {body}")
    except Exception as exc:
        print(f"[mailservice] [WARNING] Resend API call failed: {exc}")
    return False


def _build_html_email(complaint, head: dict) -> str:
    """Creates a modern, stylish, and responsive HTML email template for the citizen."""
    if isinstance(complaint, dict):
        cid = complaint.get("id", 1)
        citizen_name = complaint.get("citizen_name") or "Valued Citizen"
        category = (complaint.get("category") or "General Grievance").replace("_", " ").title()
        p = complaint.get("priority", "Medium")
        priority = (p.value if hasattr(p, "value") else str(p)).capitalize()
        dept_name = complaint.get("department_name") or f"{category} Department"
        address = complaint.get("address") or "Municipal Ward Zone, Hyderabad"
        description = complaint.get("description") or "Civic issue reported via citizen portal."
        ai_response = complaint.get("ai_response") or f"Your grievance has been validated and queued for field action by the {dept_name}."
    else:
        cid = getattr(complaint, "id", 1)
        citizen_name = getattr(complaint, "citizen_name", None) or "Valued Citizen"
        category = (getattr(complaint, "category", None) or "General Grievance").replace("_", " ").title()
        p = getattr(complaint, "priority", "Medium")
        priority = (p.value if hasattr(p, "value") else str(p)).capitalize()
        dept_name = getattr(complaint, "department_name", None) or f"{category} Department"
        address = getattr(complaint, "address", None) or "Municipal Ward Zone, Hyderabad"
        description = getattr(complaint, "description", None) or "Civic issue reported via citizen portal."
        ai_response = getattr(complaint, "ai_response", None) or f"Your grievance has been validated and queued for field action by the {dept_name}."

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
    """Send a rich, stylish HTML acknowledgement with Department Head details.
    
    Tries Port 465 (direct SSL) first for maximum cloud firewall compatibility
    (especially on Render/AWS/GCP), then falls back to Port 587 (STARTTLS).
    """
    if isinstance(complaint, dict):
        recipient = (complaint.get("citizen_contact") or "").strip()
        cid = complaint.get("id", "N/A")
        cat = complaint.get("category")
        c_name = complaint.get("citizen_name") or "Citizen"
        prio = str(complaint.get("priority", "Normal"))
        dept_name = complaint.get("department_name") or "Municipal Department"
        desc = complaint.get("description") or ""
    else:
        recipient = (getattr(complaint, "citizen_contact", None) or "").strip()
        cid = getattr(complaint, "id", "N/A")
        cat = getattr(complaint, "category", None)
        c_name = getattr(complaint, "citizen_name", None) or "Citizen"
        p = getattr(complaint, "priority", "Normal")
        prio = p.value if hasattr(p, "value") else str(p)
        dept_name = getattr(complaint, "department_name", None) or "Municipal Department"
        desc = getattr(complaint, "description", None) or ""

    username = (os.getenv("SMTP_USERNAME") or os.getenv("EMAIL_USER") or os.getenv("MAIL_USERNAME") or "").strip()
    password = (os.getenv("SMTP_PASSWORD") or os.getenv("EMAIL_PASS") or os.getenv("MAIL_PASSWORD") or "").strip()
    host = (os.getenv("SMTP_HOST") or ("smtp.gmail.com" if "@gmail.com" in username.lower() else "")).strip()
    sender = (os.getenv("SMTP_FROM") or username).strip()

    if not host or not sender or not password:
        print(f"[mailservice] [WARNING] SMTP credentials incomplete (host='{host}', sender='{sender}', has_password={bool(password)}). Set SMTP_USERNAME and SMTP_PASSWORD.")
        logger.warning("SMTP credentials incomplete; skipping email dispatch")
        return False

    has_citizen_recipient = _is_email_address(recipient)
    # Target recipient: citizen if provided, otherwise sender / admin
    primary_to = recipient if has_citizen_recipient else sender
    bcc_sender = sender if (has_citizen_recipient and _is_email_address(sender) and sender.lower() != recipient.lower()) else None

    head = get_department_head(cat)
    if has_citizen_recipient:
        subject = f"[Ticket #{cid}] Grievance Registered: {str(cat or 'Civic Issue').replace('_', ' ').title()}"
    else:
        subject = f"[Admin Alert | Ticket #{cid}] Grievance Registered: {str(cat or 'Civic Issue').replace('_', ' ').title()}"

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = f"SmartGov Civic Intelligence <{sender}>"
    message["Reply-To"] = sender
    message["To"] = primary_to
    if bcc_sender:
        message["Bcc"] = bcc_sender

    # Plain text version fallback
    notice_intro = (
        f"Hello {c_name},\n\nYour grievance has been registered successfully."
        if has_citizen_recipient
        else f"Municipal Dispatch Team,\n\nA new civic grievance #{cid} has been submitted without a citizen return email."
    )
    plain_text = (
        f"SmartGov Civic Intelligence - Official Acknowledgement\n"
        f"----------------------------------------------------\n"
        f"{notice_intro}\n\n"
        f"Ticket Number: #{cid}\n"
        f"Citizen Name: {c_name}\n"
        f"Category: {cat or 'General'}\n"
        f"Priority: {prio}\n"
        f"Assigned Department: {dept_name}\n\n"
        f"--- DEPARTMENT LEADERSHIP & ESCALATION ---\n"
        f"Department Head: {head['name']}\n"
        f"Designation: {head['title']}\n"
        f"Official Email: {head['email']}\n"
        f"Helpline: {head['phone']}\n"
        f"Zonal Office: {head['office']}\n\n"
        f"Reported Issue: \"{desc}\"\n\n"
        f"Field teams will address this grievance in accordance with municipal SLAs.\n"
        f"24/7 Citizen Helpline: 1800-425-SMART\n"
    )
    message.set_content(plain_text)

    # HTML rich visual template
    html_content = _build_html_email(complaint, head)
    message.add_alternative(html_content, subtype="html")

    # -----------------------------------------------------------------------
    # 1. BREVO HTTPS REST API (Port 443)
    # Render Free Tier blocks outbound SMTP ports 25, 465, 587 (Errno 101).
    # Brevo uses HTTPS (Port 443), which is 100% open and never blocked on Render.
    # -----------------------------------------------------------------------
    brevo_api_key = os.getenv("BREVO_API_KEY", "").strip()
    if brevo_api_key:
        print(f"[mailservice] Attempting dispatch via Brevo HTTPS REST API (Port 443) for #{cid}...")
        if _send_via_brevo_api(brevo_api_key, sender, primary_to, bcc_sender, subject, html_content, plain_text):
            logger.info("Email dispatched via Brevo HTTPS API for complaint %s to %s", cid, primary_to)
            return True

    # -----------------------------------------------------------------------
    # 2. RESEND HTTPS REST API (Port 443)
    # -----------------------------------------------------------------------
    resend_api_key = os.getenv("RESEND_API_KEY", "").strip()
    if resend_api_key:
        print(f"[mailservice] Attempting dispatch via Resend HTTPS REST API (Port 443) for #{cid}...")
        if _send_via_resend_api(resend_api_key, sender, primary_to, bcc_sender, subject, html_content, plain_text):
            logger.info("Email dispatched via Resend HTTPS API for complaint %s to %s", cid, primary_to)
            return True

    # -----------------------------------------------------------------------
    # 3. DIRECT SMTP (smtp.gmail.com:465 / 587)
    # Note: On Render Free Tier, all outbound SMTP ports are blocked with Errno 101.
    # -----------------------------------------------------------------------
    custom_port = os.getenv("SMTP_PORT")
    attempts = []
    if custom_port:
        p = int(custom_port)
        attempts.append((p, p == 465))
        # Add fallback to the alternate port
        fallback_p = 587 if p == 465 else 465
        attempts.append((fallback_p, fallback_p == 465))
    else:
        # Default: Try 465 SSL first, then 587 STARTTLS
        attempts.append((465, True))
        attempts.append((587, False))

    for port, use_ssl in attempts:
        try:
            print(f"[mailservice] Connecting to {host}:{port} ({'SSL' if use_ssl else 'STARTTLS'}) for #{cid}...")
            smtp_class = smtplib.SMTP_SSL if use_ssl else smtplib.SMTP
            with smtp_class(host, port, timeout=25) as smtp:
                smtp.ehlo()
                if not use_ssl:
                    smtp.starttls()
                    smtp.ehlo()
                if username and password:
                    smtp.login(username, password)

                # Ensure envelope recipients are explicitly provided
                all_recipients = [primary_to]
                if bcc_sender and bcc_sender.lower() != primary_to.lower():
                    all_recipients.append(bcc_sender)

                print(f"[mailservice] Sending message to envelope recipients: {all_recipients}")
                smtp.send_message(message, from_addr=sender, to_addrs=all_recipients)

            print(f"[mailservice] [SUCCESS] Notification email dispatched for #{cid} to {primary_to}" + (f" (BCC: {bcc_sender})" if bcc_sender else "") + f" via {host}:{port}!")
            logger.info("SMTP acknowledgement sent successfully for complaint %s to %s via %s:%s", cid, primary_to, host, port)
            return True
        except OSError as osc_exc:
            if getattr(osc_exc, 'errno', None) == 101 or "Network is unreachable" in str(osc_exc):
                print(f"[mailservice] [CLOUD RESTRICTION] Render Free Tier blocks outbound SMTP traffic (Errno 101 Network unreachable on port {port}).")
                print(f"[mailservice] [SOLUTION] Add BREVO_API_KEY (free 300 emails/day at brevo.com) to Render Environment to send via unblockable HTTPS (Port 443)!")
            else:
                print(f"[mailservice] [WARNING] Attempt via {host}:{port} failed: {osc_exc}")
            logger.warning("SMTP attempt via %s:%s failed: %s", host, port, osc_exc)
        except Exception as exc:
            print(f"[mailservice] [WARNING] Attempt via {host}:{port} failed: {exc}")
            logger.warning("SMTP attempt via %s:%s failed: %s", host, port, exc)

    print(f"[mailservice] [ERROR] All SMTP connection attempts failed for complaint #{cid} (recipient: {primary_to}).")
    return False