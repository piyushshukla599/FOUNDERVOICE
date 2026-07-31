"""Contact / upgrade inquiry — persist + email owner when SMTP configured."""

from __future__ import annotations

import smtplib
from email.message import EmailMessage
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from ..config import get_settings
from ..db import connect, utc_now
from ..rate_limit import allow

router = APIRouter(tags=["contact"])


class ContactBody(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=200)
    phone: str = Field(default="", max_length=40)
    company: str = Field(default="", max_length=120)
    message: str = Field(default="", max_length=4000)
    interest: str = Field(default="general", max_length=40)  # feedback | general


def _send_email(body: ContactBody) -> bool:
    settings = get_settings()
    to_addr = (settings.contact_to_email or "").strip()
    if not to_addr:
        return False

    subject = f"[FounderVoice] {body.interest.upper()} — {body.name}"
    text = (
        f"Interest: {body.interest}\n"
        f"Name: {body.name}\n"
        f"Email: {body.email}\n"
        f"Phone: {body.phone or '—'}\n"
        f"Company: {body.company or '—'}\n\n"
        f"Message:\n{body.message or '(none)'}\n"
    )

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.contact_from_email or settings.smtp_user or to_addr
    msg["To"] = to_addr
    msg["Reply-To"] = body.email
    msg.set_content(text)

    host = (settings.smtp_host or "").strip()
    if not host:
        # No SMTP — write a mailto-ready lead file instead
        leads = settings.data_path / "leads"
        leads.mkdir(parents=True, exist_ok=True)
        stamp = utc_now().replace(":", "-")
        (leads / f"{stamp}_{body.interest}.txt").write_text(text, encoding="utf-8")
        return False

    port = int(settings.smtp_port or 587)
    user = settings.smtp_user or ""
    password = settings.smtp_password or ""
    with smtplib.SMTP(host, port, timeout=30) as smtp:
        smtp.starttls()
        if user and password:
            smtp.login(user, password)
        smtp.send_message(msg)
    return True


@router.post("/contact")
def submit_contact(request: Request, body: ContactBody) -> dict[str, Any]:
    client = request.client.host if request.client else "unknown"
    if not allow(f"contact:{client}", limit=8, window_sec=3600):
        raise HTTPException(429, "Too many messages from this network. Try again later.")

    name = body.name.strip()
    email = body.email.strip()
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(400, "Please enter a valid email.")

    interest = (body.interest or "general").strip().lower()
    if interest not in {"feedback", "general", "upgrade", "pro"}:
        interest = "general"

    with connect() as conn:
        conn.execute(
            """
            INSERT INTO contact_leads (created_at, name, email, phone, company, message, interest)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                utc_now(),
                name,
                email,
                body.phone.strip(),
                body.company.strip(),
                body.message.strip(),
                interest,
            ),
        )
        conn.commit()

    emailed = False
    try:
        emailed = _send_email(body)
    except Exception:
        return {
            "status": "saved",
            "emailed": False,
            "message": "Thanks — we saved your request and will follow up.",
        }

    if emailed:
        return {
            "status": "ok",
            "emailed": True,
            "message": "Thanks — your message was sent. We'll get back to you soon.",
        }
    return {
        "status": "saved",
        "emailed": False,
        "message": "Thanks — your request was saved. We'll get back to you soon.",
    }
