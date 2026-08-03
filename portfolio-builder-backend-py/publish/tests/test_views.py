import uuid
from unittest.mock import patch

from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import AppUser
from core import jwt_service
from core.mongo import get_db
from github_auth.models import GithubAuth
from portfolio.repository import PortfolioRepository
from publish.models import PublishedPortfolio, Template


class PublishViewTestsBase(APITestCase):
    def setUp(self):
        self.user = AppUser.objects.create_user(
            email=f"pubview-{uuid.uuid4()}@example.com", password="password123", name="A"
        )
        self.user_id = str(self.user.id)
        token = jwt_service.generate_access_token(str(self.user.id), self.user.email)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        Template.objects.filter(slug="default-view-test").delete()
        Template.objects.create(
            slug="default-view-test", name="Test Template", dist_path="templates/default/dist",
            data_path="data", portfolio_filename="portfolio.json", style_filename="style.json",
            is_active=True,
        )

    def tearDown(self):
        get_db()["portfolios"].delete_many({"userId": self.user_id})
        get_db()["styles"].delete_many({"userId": self.user_id})

    def _connect_github(self):
        return GithubAuth.objects.create(
            user=self.user, github_user_id=1, github_login="octocat", access_token="tok"
        )


class PublishStatusViewTests(PublishViewTestsBase):
    url = "/api/publish/status"

    def test_requires_authentication(self):
        self.client.credentials()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_never_published(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"published": False, "repoExists": False})


class RepoSuggestViewTests(PublishViewTestsBase):
    url = "/api/publish/repo-suggest"

    def test_not_connected_returns_400(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("GitHub not connected", response.data["message"])

    @patch("publish.service.github_api.repo_exists")
    def test_connected_returns_suggestion(self, mock_repo_exists):
        self._connect_github()
        mock_repo_exists.return_value = False
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["suggestedName"], "dzigned-portfolio-octocat")


class ValidateRepoViewTests(PublishViewTestsBase):
    url = "/api/publish/validate-repo"

    def test_missing_repo_name_returns_400(self):
        self._connect_github()
        response = self.client.post(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("publish.service.github_api.repo_exists")
    def test_available_repo_name(self, mock_repo_exists):
        self._connect_github()
        mock_repo_exists.return_value = False
        response = self.client.post(self.url, {"repoName": "fresh-repo"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["available"])


class PublishViewTests(PublishViewTestsBase):
    url = "/api/publish"

    def test_invalid_mode_returns_400(self):
        response = self.client.post(self.url, {"repoName": "x", "mode": "BOGUS"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Mode must be FULL or CONTENT_ONLY", response.data["message"])

    def test_invalid_repo_name_chars_returns_400(self):
        response = self.client.post(self.url, {"repoName": "bad name!", "mode": "FULL"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_not_connected_returns_400(self):
        response = self.client.post(self.url, {"repoName": "x", "mode": "FULL"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("GitHub not connected", response.data["message"])

    def test_empty_portfolio_returns_400(self):
        self._connect_github()
        with patch("publish.service.github_api.repo_exists", return_value=False):
            response = self.client.post(self.url, {"repoName": "x", "mode": "FULL"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Portfolio is empty", response.data["message"])

    @patch("publish.service.github_api.enable_pages")
    @patch("publish.service.github_api.upsert_file")
    @patch("publish.service.github_api.create_repo")
    @patch("publish.service.github_api.repo_exists")
    def test_successful_publish_returns_expected_shape(
        self, mock_repo_exists, mock_create_repo, mock_upsert, mock_enable_pages
    ):
        self._connect_github()
        PortfolioRepository().update_section(self.user_id, "meta", {"displayName": "Jane"})
        mock_repo_exists.return_value = False

        response = self.client.post(self.url, {"repoName": "new-repo", "mode": "FULL"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["repoName"], "new-repo")
        self.assertEqual(response.data["repoUrl"], "https://github.com/octocat/new-repo")
        self.assertEqual(response.data["pagesUrl"], "https://octocat.github.io/new-repo")
        self.assertIn("lastPublishedAt", response.data)


class TemplateListViewTests(PublishViewTestsBase):
    url = "/api/publish/templates"

    def test_returns_active_templates(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        slugs = [t["slug"] for t in response.data]
        self.assertIn("default-view-test", slugs)

    def test_template_shape(self):
        response = self.client.get(self.url)
        template = next(t for t in response.data if t["slug"] == "default-view-test")
        for key in ["id", "slug", "name", "distPath", "dataPath", "portfolioFilename", "styleFilename", "isActive"]:
            self.assertIn(key, template)

    def test_inactive_templates_excluded(self):
        Template.objects.create(
            slug="hidden-tpl", name="Hidden", dist_path="d", data_path="data",
            portfolio_filename="p.json", style_filename="s.json", is_active=False,
        )
        response = self.client.get(self.url)
        slugs = [t["slug"] for t in response.data]
        self.assertNotIn("hidden-tpl", slugs)
