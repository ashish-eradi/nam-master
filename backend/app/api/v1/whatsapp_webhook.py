"""
Meta WhatsApp Business Cloud API webhook handler.

One webhook URL is registered per Meta App (not per school).
Meta posts delivery-status events for all subscribed phone numbers here.
We identify the school by phone_number_id and update message logs via meta_message_id.

Meta App Dashboard → WhatsApp → Configuration:
  Callback URL : https://your-domain/api/v1/webhook/whatsapp
  Verify Token : value of WHATSAPP_WEBHOOK_VERIFY_TOKEN in .env
  Subscribed fields: messages
"""
import hashlib
import hmac
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.notification import (
    SMSNotification as WhatsAppNotificationModel,
    WhatsAppCredential as WhatsAppCredentialModel,
)

logger = logging.getLogger(__name__)

router = APIRouter()


def _verify_signature(raw_body: bytes, signature_header: str) -> bool:
    """
    Verify Meta's X-Hub-Signature-256 header.
    Returns True if valid or if WHATSAPP_APP_SECRET is not configured.
    """
    if not settings.WHATSAPP_APP_SECRET:
        logger.warning("WHATSAPP_APP_SECRET not set — skipping webhook signature verification")
        return True
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected = hmac.new(
        settings.WHATSAPP_APP_SECRET.encode(),
        raw_body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature_header)


# ─────────────────────────────────────────────────────────────
# GET — webhook verification (Meta challenge–response)
# ─────────────────────────────────────────────────────────────

@router.get("/whatsapp")
def verify_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
):
    """
    Meta calls this endpoint once when you register (or save) the webhook URL.
    Respond with hub.challenge to confirm ownership.
    """
    if not settings.WHATSAPP_WEBHOOK_VERIFY_TOKEN:
        logger.error(
            "WHATSAPP_WEBHOOK_VERIFY_TOKEN is not configured — webhook verification will always fail"
        )
        raise HTTPException(status_code=500, detail="Webhook verify token not configured")

    if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_WEBHOOK_VERIFY_TOKEN:
        logger.info("WhatsApp webhook verified successfully")
        return Response(content=hub_challenge, media_type="text/plain")

    logger.warning("WhatsApp webhook verification failed — token mismatch")
    raise HTTPException(status_code=403, detail="Webhook verification failed")


# ─────────────────────────────────────────────────────────────
# POST — delivery status updates and inbound messages
# ─────────────────────────────────────────────────────────────

@router.post("/whatsapp", status_code=200)
async def handle_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Receive delivery-status events from Meta and update the corresponding
    SMSNotification rows.  Always returns 200 so Meta does not retry.

    Supported statuses from Meta:
      sent      → message reached Meta's servers
      delivered → message reached recipient's device
      read      → recipient opened the message
      failed    → delivery failed (errors array will contain details)
    """
    raw_body = await request.body()

    # Signature verification
    sig_header = request.headers.get("X-Hub-Signature-256", "")
    if not _verify_signature(raw_body, sig_header):
        logger.warning("Webhook signature mismatch — ignoring payload")
        # Return 200 anyway; rejecting with 4xx causes Meta to retry aggressively
        return {"status": "ignored"}

    try:
        payload = await request.json()
    except Exception:
        return {"status": "ok"}

    if payload.get("object") != "whatsapp_business_account":
        return {"status": "ok"}

    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            if change.get("field") != "messages":
                continue
            value = change.get("value", {})
            _process_statuses(db, value)

    db.commit()
    return {"status": "ok"}


def _process_statuses(db: Session, value: dict) -> None:
    """
    Parse and apply status updates from one webhook change value.
    Looks up the notification by meta_message_id scoped to the sending phone_number_id.
    """
    phone_number_id = value.get("metadata", {}).get("phone_number_id")

    # Find the school that owns this phone_number_id
    school_cred = None
    if phone_number_id:
        school_cred = db.query(WhatsAppCredentialModel).filter(
            WhatsAppCredentialModel.phone_number_id == phone_number_id,
            WhatsAppCredentialModel.is_active == True,
        ).first()
        if not school_cred:
            logger.warning("Received webhook for unknown phone_number_id=%s", phone_number_id)

    for status_event in value.get("statuses", []):
        wamid = status_event.get("id")
        new_status = status_event.get("status")           # sent|delivered|read|failed
        ts_epoch = status_event.get("timestamp")
        errors = status_event.get("errors", [])

        if not wamid or not new_status:
            continue

        query = db.query(WhatsAppNotificationModel).filter(
            WhatsAppNotificationModel.meta_message_id == wamid
        )
        if school_cred:
            query = query.filter(
                WhatsAppNotificationModel.school_id == school_cred.school_id
            )

        notif = query.first()
        if not notif:
            logger.debug("No notification found for wamid=%s (may be already deleted)", wamid)
            continue

        ts = (
            datetime.fromtimestamp(int(ts_epoch), tz=timezone.utc)
            if ts_epoch
            else datetime.now(timezone.utc)
        )

        # Status progression guard: never downgrade (read > delivered > sent)
        _STATUS_RANK = {"pending": 0, "sent": 1, "delivered": 2, "read": 3, "failed": 4}
        current_rank = _STATUS_RANK.get(notif.status, 0)
        new_rank = _STATUS_RANK.get(new_status, 0)

        # Allow failed to overwrite anything; otherwise only advance forward
        if new_status != "failed" and new_rank <= current_rank:
            continue

        notif.status = new_status

        if new_status == "sent":
            notif.sent_at = notif.sent_at or ts
        elif new_status == "delivered":
            notif.delivered_at = ts
        elif new_status == "read":
            notif.read_at = ts
        elif new_status == "failed":
            error_detail = errors[0].get("message", "Unknown error") if errors else "Unknown error"
            notif.error_message = error_detail
            logger.warning("Delivery failed for wamid=%s: %s", wamid, error_detail)

        logger.info("Updated wamid=%s status → %s", wamid, new_status)
