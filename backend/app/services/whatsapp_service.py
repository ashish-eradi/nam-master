"""
WhatsApp Business Cloud API (Meta) service.
Sends messages via Meta's Cloud API on behalf of each school's WABA.
"""
import httpx
import logging
from typing import Optional, List

logger = logging.getLogger(__name__)

META_API_VERSION = "v21.0"
META_GRAPH_URL = f"https://graph.facebook.com/{META_API_VERSION}"


class WhatsAppSendError(Exception):
    """Raised when the Meta Cloud API rejects or errors a send."""
    pass


class WhatsAppService:
    """Stateless helpers for sending WhatsApp messages via Meta Cloud API."""

    @staticmethod
    def send_text(phone_number_id: str, access_token: str, to: str, body: str) -> str:
        """
        Send a free-form text message within the 24-hour customer-service window.
        Returns the Meta wamid (message ID) for delivery tracking.
        """
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to.lstrip("+"),
            "type": "text",
            "text": {"preview_url": False, "body": body},
        }
        return WhatsAppService._call_messages_api(phone_number_id, access_token, payload)

    @staticmethod
    def send_template(
        phone_number_id: str,
        access_token: str,
        to: str,
        template_name: str,
        language_code: str = "en",
        body_params: Optional[List[str]] = None,
        header_params: Optional[List[str]] = None,
    ) -> str:
        """
        Send a Meta-approved template message (works outside the 24-hour window).
        body_params / header_params are positional text values matching {{1}}, {{2}}, …
        in the approved template. Returns the Meta wamid for delivery tracking.
        """
        components: list = []

        if header_params:
            components.append({
                "type": "header",
                "parameters": [{"type": "text", "text": p} for p in header_params],
            })

        if body_params:
            components.append({
                "type": "body",
                "parameters": [{"type": "text", "text": p} for p in body_params],
            })

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to.lstrip("+"),
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language_code},
                "components": components,
            },
        }
        return WhatsAppService._call_messages_api(phone_number_id, access_token, payload)

    @staticmethod
    def _call_messages_api(phone_number_id: str, access_token: str, payload: dict) -> str:
        url = f"{META_GRAPH_URL}/{phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }
        try:
            resp = httpx.post(url, json=payload, headers=headers, timeout=15)
        except httpx.TimeoutException:
            raise WhatsAppSendError("Request to Meta Cloud API timed out")
        except httpx.RequestError as exc:
            raise WhatsAppSendError(f"Network error calling Meta Cloud API: {exc}")

        if resp.status_code not in (200, 201):
            error = resp.json().get("error", {})
            raise WhatsAppSendError(
                f"Meta API {resp.status_code}: {error.get('message', resp.text)}"
            )

        data = resp.json()
        messages = data.get("messages", [])
        if not messages or not messages[0].get("id"):
            raise WhatsAppSendError("Meta API returned no message ID in response")

        wamid = messages[0]["id"]
        logger.info("WhatsApp sent via Meta Cloud API wamid=%s", wamid)
        return wamid
