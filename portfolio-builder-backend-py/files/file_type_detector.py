from core.exceptions import BadRequestException

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"}


def _starts_with(data: bytes, *signature: int) -> bool:
    if len(data) < len(signature):
        return False
    return all(data[i] == b for i, b in enumerate(signature))


def detect(data: bytes) -> str | None:
    if not data:
        return None

    if _starts_with(data, 0xFF, 0xD8, 0xFF):
        return "image/jpeg"
    if _starts_with(data, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A):
        return "image/png"
    if _starts_with(data, 0x47, 0x49, 0x46, 0x38, 0x37, 0x61) or _starts_with(
        data, 0x47, 0x49, 0x46, 0x38, 0x39, 0x61
    ):
        return "image/gif"
    # WebP: "RIFF" .... "WEBP"
    if _starts_with(data, 0x52, 0x49, 0x46, 0x46) and len(data) >= 12 and data[8:12] == b"WEBP":
        return "image/webp"
    if _starts_with(data, 0x25, 0x50, 0x44, 0x46):  # %PDF
        return "application/pdf"
    return None


def _normalize(content_type: str | None) -> str | None:
    if not content_type or not content_type.strip():
        return None
    ct = content_type.strip().lower()
    # Browsers/clients sometimes send these aliases for JPEG.
    if ct in ("image/jpg", "image/pjpeg"):
        return "image/jpeg"
    return ct


def verify(declared_content_type: str | None, data: bytes) -> str:
    detected = detect(data)
    if detected is None:
        raise BadRequestException("Unsupported or corrupted file. Allowed types: JPG, PNG, GIF, WebP, PDF")

    declared = _normalize(declared_content_type)
    if declared is not None and declared != detected:
        raise BadRequestException(f"File content does not match its declared type ({declared_content_type})")

    return detected
