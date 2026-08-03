from pathlib import Path

from core.exceptions import NotFoundException

from .models import Template

TEMPLATE_FILES_DIR = Path(__file__).resolve().parent / "template_files"


def get_by_slug(slug: str) -> Template:
    try:
        return Template.objects.get(slug=slug)
    except Template.DoesNotExist:
        raise NotFoundException(f"Template not found: {slug}")


def get_active_templates() -> list[Template]:
    return list(Template.objects.filter(is_active=True))


def get_default() -> Template:
    # Ordered by created_at for determinism — the Java version has no ORDER BY here,
    # relying on incidental DB ordering (harmless with today's single template).
    template = Template.objects.filter(is_active=True).order_by("created_at").first()
    if template is None:
        raise NotFoundException("No active templates available")
    return template
