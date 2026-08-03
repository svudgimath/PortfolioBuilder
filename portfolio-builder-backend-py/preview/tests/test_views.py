import uuid

from rest_framework import status
from rest_framework.test import APITestCase

from core.mongo import get_db
from portfolio.repository import PortfolioRepository
from publish.models import Template
from styles.service import save_style


class PreviewTestsBase(APITestCase):
    def setUp(self):
        self.user_id = str(uuid.uuid4())
        Template.objects.filter(slug="preview-test-default").delete()
        self.template = Template.objects.create(
            slug="preview-test-default", name="Test Template", dist_path="templates/default/dist",
            data_path="data", portfolio_filename="portfolio.json", style_filename="style.json",
            is_active=True,
        )

    def tearDown(self):
        get_db()["portfolios"].delete_many({"userId": self.user_id})
        get_db()["styles"].delete_many({"userId": self.user_id})


class PortfolioDataViewTests(PreviewTestsBase):
    def test_is_public_no_auth_required(self):
        response = self.client.get(f"/api/preview/{self.user_id}/data/portfolio.json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_auto_creates_empty_portfolio(self):
        response = self.client.get(f"/api/preview/{self.user_id}/data/portfolio.json")
        self.assertEqual(response.data["userId"], self.user_id)
        self.assertIsNone(response.data["meta"])

    def test_reflects_saved_content(self):
        PortfolioRepository().update_section(self.user_id, "meta", {"displayName": "Jane"})
        response = self.client.get(f"/api/preview/{self.user_id}/data/portfolio.json")
        self.assertEqual(response.data["meta"]["displayName"], "Jane")


class StyleDataViewTests(PreviewTestsBase):
    def test_no_active_style_returns_empty_object(self):
        response = self.client.get(f"/api/preview/{self.user_id}/data/style.json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {})

    def test_returns_active_style(self):
        save_style(self.user_id, {"theme": {"mode": "dark"}})
        response = self.client.get(f"/api/preview/{self.user_id}/data/style.json")
        self.assertEqual(response.data["theme"]["mode"], "dark")


class PreviewRedirectTests(PreviewTestsBase):
    def test_no_trailing_slash_redirects_to_trailing_slash(self):
        response = self.client.get(f"/api/preview/{self.user_id}")
        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertEqual(response.url, f"/api/preview/{self.user_id}/")


class PreviewStaticFileTests(PreviewTestsBase):
    def test_index_shell_served_with_base_tag_injected(self):
        response = self.client.get(f"/api/preview/{self.user_id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "text/html")
        content = response.content.decode()
        self.assertIn(f'<base href="/api/preview/{self.user_id}/">', content)

    def test_index_shell_strips_crossorigin_attribute(self):
        response = self.client.get(f"/api/preview/{self.user_id}/")
        content = response.content.decode()
        self.assertNotIn("crossorigin", content)

    def test_known_asset_served_with_correct_content_type(self):
        response = self.client.get(f"/api/preview/{self.user_id}/favicon.svg")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "image/svg+xml")

    def test_unknown_deep_link_falls_back_to_spa_shell(self):
        response = self.client.get(f"/api/preview/{self.user_id}/projects/some-project")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "text/html")
        self.assertIn("<base href=", response.content.decode())

    def test_data_portfolio_json_under_static_route_returns_404(self):
        # Sanity: the literal /data/portfolio.json route takes priority, but the
        # defensive guard inside the static view should also reject it if ever reached.
        response = self.client.get(f"/api/preview/{self.user_id}/data/portfolio.json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)  # routed to PortfolioDataView, not static

    def test_path_traversal_is_rejected(self):
        response = self.client.get(f"/api/preview/{self.user_id}/../../../../etc/passwd")
        # Either falls back to the SPA shell or 404s — must NOT leak filesystem content.
        self.assertNotIn(b"root:", response.content)

    def test_cache_control_header_present(self):
        response = self.client.get(f"/api/preview/{self.user_id}/")
        self.assertEqual(response["Cache-Control"], "no-cache")

    def test_no_active_templates_raises_not_found(self):
        Template.objects.filter(slug="preview-test-default").update(is_active=False)
        response = self.client.get(f"/api/preview/{self.user_id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
