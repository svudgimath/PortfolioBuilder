import uuid
from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import AppUser
from core import jwt_service
from core.mongo import get_db
from portfolio.repository import PortfolioRepository
from publish.models import PublishedPortfolio


class DashboardViewTestsBase(APITestCase):
    url = "/api/dashboard"

    def setUp(self):
        self.user = AppUser.objects.create_user(
            email=f"dash-{uuid.uuid4()}@example.com", password="password123", name="Dash Tester"
        )
        self.user_id = str(self.user.id)
        token = jwt_service.generate_access_token(str(self.user.id), self.user.email)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def tearDown(self):
        get_db()["portfolios"].delete_many({"userId": self.user_id})


class DashboardEmptyStateTests(DashboardViewTestsBase):
    def test_requires_authentication(self):
        self.client.credentials()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_fresh_user_has_no_completed_sections(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["portfolio"]["completedSections"], [])
        self.assertEqual(response.data["portfolio"]["totalSections"], 12)

    def test_fresh_user_has_no_publish_record(self):
        response = self.client.get(self.url)
        self.assertEqual(response.data["publish"], {
            "published": False,
            "repoExists": False,
            "pagesUrl": None,
            "lastPublishedAt": None,
            "hasUnpublishedChanges": False,
        })

    def test_user_info_included(self):
        response = self.client.get(self.url)
        self.assertEqual(response.data["user"], {"name": "Dash Tester", "email": self.user.email})

    def test_auto_creates_empty_portfolio_like_get_portfolio_does(self):
        self.client.get(self.url)
        doc = PortfolioRepository().find_by_user_id(self.user_id)
        self.assertIsNotNone(doc)


class DashboardWithContentTests(DashboardViewTestsBase):
    def test_completed_sections_reflect_saved_data(self):
        PortfolioRepository().update_section(self.user_id, "meta", {"displayName": "Jane"})
        PortfolioRepository().update_section(self.user_id, "hero", {"greeting": "Hi"})

        response = self.client.get(self.url)

        self.assertCountEqual(response.data["portfolio"]["completedSections"], ["meta", "hero"])

    def test_portfolio_updated_at_reflects_last_save(self):
        PortfolioRepository().update_section(self.user_id, "meta", {"displayName": "Jane"})
        response = self.client.get(self.url)
        self.assertIsNotNone(response.data["portfolio"]["updatedAt"])


class DashboardPublishInfoTests(DashboardViewTestsBase):
    def test_published_with_no_changes_since(self):
        PortfolioRepository().update_section(self.user_id, "meta", {"displayName": "Jane"})
        portfolio_doc = PortfolioRepository().find_by_user_id(self.user_id)

        PublishedPortfolio.objects.create(
            user=self.user,
            repo_name="my-repo",
            repo_url="https://github.com/octocat/my-repo",
            pages_url="https://octocat.github.io/my-repo",
            last_published_at=portfolio_doc["updatedAt"] + timedelta(seconds=1),
        )

        response = self.client.get(self.url)

        self.assertTrue(response.data["publish"]["published"])
        self.assertTrue(response.data["publish"]["repoExists"])
        self.assertEqual(response.data["publish"]["pagesUrl"], "https://octocat.github.io/my-repo")
        self.assertFalse(response.data["publish"]["hasUnpublishedChanges"])

    def test_has_unpublished_changes_when_portfolio_saved_after_publish(self):
        PublishedPortfolio.objects.create(
            user=self.user,
            repo_name="my-repo",
            repo_url="https://github.com/octocat/my-repo",
            last_published_at=timezone.now() - timedelta(minutes=5),
        )
        PortfolioRepository().update_section(self.user_id, "meta", {"displayName": "Jane"})

        response = self.client.get(self.url)

        self.assertTrue(response.data["publish"]["hasUnpublishedChanges"])

    def test_no_unpublished_changes_when_never_saved_after_publish(self):
        PublishedPortfolio.objects.create(
            user=self.user,
            repo_name="my-repo",
            repo_url="https://github.com/octocat/my-repo",
            last_published_at=timezone.now() + timedelta(minutes=5),
        )
        response = self.client.get(self.url)
        self.assertFalse(response.data["publish"]["hasUnpublishedChanges"])
