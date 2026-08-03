import logging

import cloudinary
import cloudinary.uploader
from django.conf import settings

from core.exceptions import BadGatewayException

from . import file_type_detector
from .cloudinary_ref import parse as parse_cloudinary_ref

logger = logging.getLogger(__name__)

_configured = False


def _ensure_configured() -> None:
    global _configured
    if not _configured:
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
            secure=True,
        )
        _configured = True


def store(data: bytes, filename: str, declared_content_type: str | None, user_id: str) -> dict:
    _ensure_configured()

    # Verify the real content matches the declared type, and persist using the
    # detected canonical type rather than trusting the client-provided one.
    verified_content_type = file_type_detector.verify(declared_content_type, data)

    options = {
        "resource_type": "auto",  # image | raw (PDF) — Cloudinary detects
        "folder": f"dzigned/users/{user_id}",
        "use_filename": True,
        "unique_filename": True,
        "overwrite": False,
        "tags": ["dzigned", f"userId:{user_id}"],
    }

    try:
        result = cloudinary.uploader.upload(data, **options)
    except Exception as e:
        logger.warning("Cloudinary upload failed for userId=%s: %s", user_id, e)
        raise BadGatewayException("File upload failed. Please try again.") from e

    return {
        "url": result["secure_url"],
        "publicId": result["public_id"],
        "resourceType": result["resource_type"],
        "contentType": verified_content_type,
        "filename": filename,
        "bytes": result["bytes"],
    }


def delete(public_id: str | None, resource_type: str | None) -> None:
    """Delete by public_id + resource_type. Best-effort — never raises."""
    if not public_id or not public_id.strip():
        return
    _ensure_configured()
    try:
        cloudinary.uploader.destroy(public_id, resource_type=resource_type or "image", invalidate=True)
    except Exception as e:
        logger.warning("Cloudinary delete failed publicId=%s: %s", public_id, e)


def delete_by_url(url: str | None) -> None:
    """Convenience: delete by stored URL. Silently ignores non-Cloudinary URLs."""
    ref = parse_cloudinary_ref(url)
    if ref is not None:
        delete(ref.public_id, ref.resource_type)
