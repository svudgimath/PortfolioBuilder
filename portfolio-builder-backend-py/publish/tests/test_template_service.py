from django.test import TestCase

from core.exceptions import NotFoundException
from publish import template_service
from publish.models import Template


class TemplateServiceTests(TestCase):
    def setUp(self):
        Template.objects.all().delete()

    def test_get_by_slug_returns_template(self):
        Template.objects.create(
            slug="t1", name="Template One", dist_path="templates/t1/dist", data_path="data",
            portfolio_filename="portfolio.json", style_filename="style.json", is_active=True,
        )
        template = template_service.get_by_slug("t1")
        self.assertEqual(template.name, "Template One")

    def test_get_by_slug_missing_raises_not_found(self):
        with self.assertRaises(NotFoundException):
            template_service.get_by_slug("nope")

    def test_get_active_templates_excludes_inactive(self):
        Template.objects.create(
            slug="active1", name="A", dist_path="d", data_path="data",
            portfolio_filename="p.json", style_filename="s.json", is_active=True,
        )
        Template.objects.create(
            slug="inactive1", name="B", dist_path="d", data_path="data",
            portfolio_filename="p.json", style_filename="s.json", is_active=False,
        )
        active = template_service.get_active_templates()
        self.assertEqual([t.slug for t in active], ["active1"])

    def test_get_default_returns_earliest_created_active_template(self):
        first = Template.objects.create(
            slug="first", name="First", dist_path="d", data_path="data",
            portfolio_filename="p.json", style_filename="s.json", is_active=True,
        )
        Template.objects.create(
            slug="second", name="Second", dist_path="d", data_path="data",
            portfolio_filename="p.json", style_filename="s.json", is_active=True,
        )
        self.assertEqual(template_service.get_default().slug, first.slug)

    def test_get_default_raises_when_none_active(self):
        Template.objects.create(
            slug="inactive-only", name="X", dist_path="d", data_path="data",
            portfolio_filename="p.json", style_filename="s.json", is_active=False,
        )
        with self.assertRaises(NotFoundException):
            template_service.get_default()

    def test_seeded_default_template_files_exist_on_disk(self):
        Template.objects.create(
            slug="default", name="Developer Portfolio", dist_path="templates/default/dist",
            data_path="data", portfolio_filename="portfolio.json", style_filename="style.json",
            is_active=True,
        )
        template = template_service.get_by_slug("default")
        dist_dir = template_service.TEMPLATE_FILES_DIR / template.dist_path
        self.assertTrue(dist_dir.is_dir())
        self.assertTrue((dist_dir / "index.html").is_file())
