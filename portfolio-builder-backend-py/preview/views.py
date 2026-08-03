import re
from pathlib import Path

from django.http import HttpResponse, HttpResponseNotFound, HttpResponseRedirect
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from portfolio.repository import PortfolioRepository, serialize_document
from publish import template_service
from styles.service import get_active_style, serialize_style

_portfolio_repository = PortfolioRepository()

CONTENT_TYPES = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
}


def _content_type(file_path: str) -> str:
    for ext, content_type in CONTENT_TYPES.items():
        if file_path.endswith(ext):
            return content_type
    return "application/octet-stream"


def _strip_crossorigin(html: str) -> str:
    """Vite emits crossorigin on <script>/<link> tags, which forces CORS-mode
    fetches even though the preview page is same-origin with its own assets
    once loaded directly from this backend — strip it so those requests aren't
    blocked by our (unrelated) CORS allow-list."""
    return re.sub(r'\s+crossorigin(="[^"]*")?', "", html)


def _resolve_safe_path(base_dir: Path, relative_path: str) -> Path | None:
    """Resolves relative_path under base_dir, rejecting any path-traversal
    attempt (e.g. `../../etc`) that would escape the template directory."""
    try:
        candidate = (base_dir / relative_path).resolve()
        candidate.relative_to(base_dir.resolve())
    except (ValueError, OSError):
        return None
    return candidate


def _default_template_dist_dir() -> Path:
    return template_service.TEMPLATE_FILES_DIR / template_service.get_default().dist_path


class PortfolioDataView(APIView):
    """GET /api/preview/{userId}/data/portfolio.json — public."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, user_id):
        doc = _portfolio_repository.get_or_create(user_id)
        return Response(serialize_document(doc))


class StyleDataView(APIView):
    """GET /api/preview/{userId}/data/style.json — public."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, user_id):
        style = get_active_style(user_id)
        if style is None:
            return Response({})
        return Response(serialize_style(style))


class PreviewRedirectView(APIView):
    """GET /api/preview/{userId} (no trailing slash) — 302 to the trailing-slash
    URL so the document URL matches the injected <base href>."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, user_id):
        return HttpResponseRedirect(f"/api/preview/{user_id}/")


class PreviewStaticView(APIView):
    """GET /api/preview/{userId}/** — serves the template's pre-built SPA:
    known asset paths as-is, everything else (deep links, missing files) falls
    back to the SPA shell (index.html) with a <base> tag injected."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, user_id, file_path=""):
        if file_path.startswith("data/portfolio.json") or file_path.startswith("data/style.json"):
            return HttpResponseNotFound()

        if not file_path:
            return self._serve_index_with_base(user_id)

        base_dir = _default_template_dist_dir()
        resolved = _resolve_safe_path(base_dir, file_path)

        if resolved is None or not resolved.is_file():
            return self._serve_index_with_base(user_id)

        response = HttpResponse(resolved.read_bytes(), content_type=_content_type(file_path))
        response["Cache-Control"] = "no-cache"
        return response

    def _serve_index_with_base(self, user_id):
        index_path = _default_template_dist_dir() / "index.html"
        if not index_path.is_file():
            return HttpResponseNotFound()

        html = index_path.read_text(encoding="utf-8")
        base_tag = f'<base href="/api/preview/{user_id}/">'
        html = html.replace("<head>", f"<head>{base_tag}")
        html = _strip_crossorigin(html)

        response = HttpResponse(html, content_type="text/html")
        response["Cache-Control"] = "no-cache"
        return response
