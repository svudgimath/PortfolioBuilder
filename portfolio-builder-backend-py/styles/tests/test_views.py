import uuid
from unittest.mock import patch

from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import AppUser
from core import jwt_service
from core.mongo import get_db
from portfolio.repository import PortfolioRepository

VALID_STYLE_PAYLOAD = {"theme": {"mode": "dark"}, "typography": {"headingFont": "Sora"}}


class StyleViewTestsBase(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = AppUser.objects.create_user(
            email=f"styles-{uuid.uuid4()}@example.com", password="password123", name="Styles Tester"
        )
        token = jwt_service.generate_access_token(str(self.user.id), self.user.email)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def tearDown(self):
        get_db()["portfolios"].delete_many({"userId": str(self.user.id)})
        get_db()["styles"].delete_many({"userId": str(self.user.id)})


class StyleActiveEndpointTests(StyleViewTestsBase):
    url = "/api/styles/active"

    def test_requires_authentication(self):
        self.client.credentials()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_no_active_style_returns_204(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_returns_active_style_after_save(self):
        self.client.post("/api/styles", VALID_STYLE_PAYLOAD, format="json")
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["theme"]["mode"], "dark")


class StyleListCreateEndpointTests(StyleViewTestsBase):
    url = "/api/styles"

    def test_list_empty_initially(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_save_then_list_returns_it(self):
        self.client.post(self.url, VALID_STYLE_PAYLOAD, format="json")
        response = self.client.get(self.url)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["version"], 1)

    def test_save_returns_full_shape(self):
        response = self.client.post(self.url, VALID_STYLE_PAYLOAD, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("id", response.data)
        self.assertIn("userId", response.data)
        self.assertIn("portfolioId", response.data)
        self.assertTrue(response.data["isActive"])

    def test_list_ordered_newest_version_first(self):
        self.client.post(self.url, {"n": 1}, format="json")
        self.client.post(self.url, {"n": 2}, format="json")
        response = self.client.get(self.url)
        self.assertEqual(response.data[0]["version"], 2)
        self.assertEqual(response.data[1]["version"], 1)


class StyleQuotaEndpointTests(StyleViewTestsBase):
    url = "/api/styles/quota"

    def test_fresh_user_has_full_quota(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["remainingToday"], 5)
        self.assertEqual(response.data["remainingThisMinute"], 5)
        self.assertIn("resetsAt", response.data)


class StyleActivateEndpointTests(StyleViewTestsBase):
    def test_activate_switches_active_style(self):
        first = self.client.post("/api/styles", {"n": 1}, format="json").data
        second = self.client.post("/api/styles", {"n": 2}, format="json").data
        # First save auto-activates; second defaults to inactive.
        self.assertTrue(first["isActive"])
        self.assertFalse(second["isActive"])

        response = self.client.patch(f"/api/styles/{second['id']}/activate")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["isActive"])

        list_response = self.client.get("/api/styles")
        active_flags = {s["id"]: s["isActive"] for s in list_response.data}
        self.assertFalse(active_flags[first["id"]])
        self.assertTrue(active_flags[second["id"]])

    def test_activate_missing_style_returns_404(self):
        response = self.client.patch("/api/styles/000000000000000000000000/activate")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_activate_someone_elses_style_returns_401(self):
        style = self.client.post("/api/styles", {}, format="json").data
        other_user = AppUser.objects.create_user(
            email=f"other-{uuid.uuid4()}@example.com", password="password123", name="Other"
        )
        other_token = jwt_service.generate_access_token(str(other_user.id), other_user.email)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {other_token}")

        response = self.client.patch(f"/api/styles/{style['id']}/activate")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class StyleDeleteEndpointTests(StyleViewTestsBase):
    def test_delete_removes_style(self):
        style = self.client.post("/api/styles", {}, format="json").data
        response = self.client.delete(f"/api/styles/{style['id']}")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        list_response = self.client.get("/api/styles")
        self.assertEqual(list_response.data, [])

    def test_delete_missing_style_returns_404(self):
        response = self.client.delete("/api/styles/000000000000000000000000")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class StyleGenerateEndpointTests(StyleViewTestsBase):
    url = "/api/styles/generate"

    def test_generate_without_portfolio_returns_400(self):
        response = self.client.post(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Create your portfolio", response.data["message"])

    def test_prompt_too_long_returns_400(self):
        response = self.client.post(self.url, {"prompt": "x" * 2001}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Prompt must be at most 2000 characters", response.data["message"])

    @patch("styles.llm.generation_service.gemini_generator.generate")
    def test_generate_success_returns_style_and_quota(self, mock_generate):
        PortfolioRepository().get_or_create(str(self.user.id))
        mock_generate.return_value = dict(VALID_STYLE_PAYLOAD)

        response = self.client.post(self.url, {"prompt": "warm editorial"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["style"]["theme"]["mode"], "dark")
        self.assertEqual(response.data["style"]["prompt"], "warm editorial")
        self.assertEqual(response.data["quota"]["remainingToday"], 4)

    @patch("styles.llm.generation_service.gemini_generator.generate")
    def test_generate_empty_body_is_valid(self, mock_generate):
        PortfolioRepository().get_or_create(str(self.user.id))
        mock_generate.return_value = dict(VALID_STYLE_PAYLOAD)

        response = self.client.post(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_generate_requires_authentication(self):
        self.client.credentials()
        response = self.client.post(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_daily_rate_limit_returns_429_with_llm_error_shape(self):
        from datetime import timedelta

        from django.utils import timezone as dj_timezone

        from styles.models import GenerationLog

        PortfolioRepository().get_or_create(str(self.user.id))
        # Seed 5 successes a couple minutes in the past — outside the 60s minute
        # window (so only the daily cap is what's being exercised here) but still
        # "today" in UTC terms.
        old_timestamp = dj_timezone.now() - timedelta(minutes=2)
        for _ in range(5):
            entry = GenerationLog.objects.create(user_id=self.user.id, status=GenerationLog.Status.SUCCESS)
            entry.created_at = old_timestamp
            entry.save()

        response = self.client.post(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(response.data["error"], "rate_limit_daily")
        self.assertNotIn("status", response.data)
        self.assertNotIn("path", response.data)
