import uuid
from unittest.mock import patch

from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import AppUser
from core import jwt_service
from github_auth.models import GithubAuth


class GithubStatusViewTests(APITestCase):
    def setUp(self):
        self.user = AppUser.objects.create_user(
            email=f"ghstatus-{uuid.uuid4()}@example.com", password="password123", name="A"
        )
        token = jwt_service.generate_access_token(str(self.user.id), self.user.email)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_requires_authentication(self):
        self.client.credentials()
        response = self.client.get("/api/github/status")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_not_connected(self):
        response = self.client.get("/api/github/status")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"connected": False})

    def test_connected(self):
        GithubAuth.objects.create(
            user=self.user, github_user_id=1, github_login="octocat", access_token="tok"
        )
        response = self.client.get("/api/github/status")
        self.assertEqual(response.data, {"connected": True, "githubLogin": "octocat"})


class GithubConnectViewTests(APITestCase):
    def setUp(self):
        self.user = AppUser.objects.create_user(
            email=f"ghconnect-{uuid.uuid4()}@example.com", password="password123", name="A"
        )
        self.token = jwt_service.generate_access_token(str(self.user.id), self.user.email)

    def test_missing_token_returns_401(self):
        response = self.client.get("/api/github/connect")
        self.assertEqual(response.status_code, 401)

    def test_invalid_token_returns_401(self):
        response = self.client.get("/api/github/connect?token=garbage")
        self.assertEqual(response.status_code, 401)

    def test_valid_token_redirects_to_github_authorize(self):
        response = self.client.get(f"/api/github/connect?token={self.token}")
        self.assertEqual(response.status_code, 302)
        self.assertTrue(response.url.startswith("https://github.com/login/oauth/authorize?"))
        self.assertIn(f"state={self.token}", response.url)


class GithubCallbackViewTests(APITestCase):
    def setUp(self):
        self.user = AppUser.objects.create_user(
            email=f"ghcallback-{uuid.uuid4()}@example.com", password="password123", name="A"
        )
        self.token = jwt_service.generate_access_token(str(self.user.id), self.user.email)

    def test_error_param_redirects_with_error(self):
        response = self.client.get("/api/github/callback?error=access_denied")
        self.assertEqual(response.status_code, 302)
        self.assertIn("/publish?github=error", response.url)

    def test_missing_code_redirects_with_error(self):
        response = self.client.get(f"/api/github/callback?state={self.token}")
        self.assertEqual(response.status_code, 302)
        self.assertIn("github=error", response.url)

    def test_missing_state_redirects_with_error(self):
        response = self.client.get("/api/github/callback?code=abc")
        self.assertEqual(response.status_code, 302)
        self.assertIn("github=error", response.url)

    def test_invalid_state_redirects_with_error(self):
        response = self.client.get("/api/github/callback?code=abc&state=garbage")
        self.assertEqual(response.status_code, 302)
        self.assertIn("github=error", response.url)

    @patch("github_auth.views.service.connect_github")
    def test_success_redirects_with_connected(self, mock_connect):
        response = self.client.get(f"/api/github/callback?code=abc&state={self.token}")
        self.assertEqual(response.status_code, 302)
        self.assertIn("/publish?github=connected", response.url)
        mock_connect.assert_called_once_with(str(self.user.id), "abc")

    @patch("github_auth.views.service.connect_github")
    def test_service_exception_redirects_with_encoded_message(self, mock_connect):
        mock_connect.side_effect = Exception("boom failure")
        response = self.client.get(f"/api/github/callback?code=abc&state={self.token}")
        self.assertEqual(response.status_code, 302)
        self.assertIn("github=error", response.url)
        self.assertIn("message=boom", response.url)

    @override_settings(GITHUB_FRONTEND_SUCCESS_URL="http://localhost:5173")
    def test_redirect_target_uses_configured_frontend_url(self):
        response = self.client.get("/api/github/callback?error=x")
        self.assertTrue(response.url.startswith("http://localhost:5173/publish"))
