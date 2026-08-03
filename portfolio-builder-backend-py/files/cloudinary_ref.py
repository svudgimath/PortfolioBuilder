import re
from dataclasses import dataclass

VALID_RESOURCE_TYPES = {"image", "raw", "video"}

_UPLOAD_MARKER = "/upload/"
_VERSION_PREFIX_RE = re.compile(r"^v\d+/")


@dataclass(frozen=True)
class CloudinaryRef:
    public_id: str
    resource_type: str


def parse(url: str | None) -> CloudinaryRef | None:
    """Parse a Cloudinary secure_url into a CloudinaryRef.

    Expected pattern (with optional version + folder):
        https://res.cloudinary.com/<cloud>/<resource_type>/upload/[v<version>/][<folder>/]<publicId>.<ext>

    Returns None if url is blank or doesn't look like a Cloudinary URL.
    """
    if not url or not url.strip():
        return None

    upload_idx = url.find(_UPLOAD_MARKER)
    if upload_idx < 0:
        return None

    # Resource type sits in the path segment immediately before "/upload/".
    prev_slash = url.rfind("/", 0, upload_idx)
    if prev_slash < 0:
        return None
    resource_type = url[prev_slash + 1 : upload_idx]
    if resource_type not in VALID_RESOURCE_TYPES:
        return None

    # Everything after "/upload/" is [v<version>/]<folder>/<publicId>.<ext>.
    tail = url[upload_idx + len(_UPLOAD_MARKER) :]
    tail = _VERSION_PREFIX_RE.sub("", tail, count=1)

    # Strip the final extension — only if there's a dot AFTER the last slash
    # (so folder names containing dots aren't accidentally truncated).
    last_dot = tail.rfind(".")
    last_slash = tail.rfind("/")
    if last_dot > last_slash:
        tail = tail[:last_dot]

    if not tail.strip():
        return None

    return CloudinaryRef(public_id=tail, resource_type=resource_type)
