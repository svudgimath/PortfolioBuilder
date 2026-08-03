from unittest.mock import patch

from django.test import TestCase

from accounts.models import AppUser
from core.exceptions import BadRequestException, ConflictException, NotFoundException
from github_auth import service
from github_auth.models import GithubAuth

VALID_TOKEN = {"access_token": "gho_abc123", "token_type": "bearer", "scope": "public_repo"}
GITHUB_USER = {"id": 555, "login": "octocat", "name": "The Octocat"}


class GetGithubAuthTests(TestCase):
    def setUp(self):
        self.user = AppUser.objects.create_user(email="ghtest1@example.com", password="password123", name="A")

    def test_returns_none_when_not_connected(self):
        self.assertIsNone(service.get_github_auth(str(self.user.id)))
        self.assertFalse(service.is_github_connected(str(self.user.id)))

    def test_returns_auth_when_connected(self):
        GithubAuth.objects.create(
            user=self.user, github_user_id=1, github_login="octocat", access_token="tok"
        )
        auth = service.get_github_auth(str(self.user.id))
        self.assertIsNotNone(auth)
        self.assertTrue(service.is_github_connected(str(self.user.id)))


class ConnectGithubTests(TestCase):
    def setUp(self):
        self.user = AppUser.objects.create_user(email="ghtest2@example.com", password="password123", name="A")

    @patch("github_auth.service.api_client.get_current_user")
    @patch("github_auth.service.oauth_client.exchange_code_for_token")
    def test_success_creates_github_auth(self, mock_exchange, mock_get_user):
        mock_exchange.return_value = VALID_TOKEN
        mock_get_user.return_value = GITHUB_USER

        auth = service.connect_github(str(self.user.id), "some-code")

        self.assertEqual(auth.github_login, "octocat")
        self.assertEqual(auth.github_user_id, 555)
        self.assertEqual(auth.access_token, "gho_abc123")
        self.assertEqual(auth.token_type, "bearer")
        self.assertEqual(auth.scope, "public_repo")

    @patch("github_auth.service.api_client.get_current_user")
    @patch("github_auth.service.oauth_client.exchange_code_for_token")
    def test_reconnecting_updates_existing_row(self, mock_exchange, mock_get_user):
        existing = GithubAuth.objects.create(
            user=self.user, github_user_id=555, github_login="old-login", access_token="old-tok"
        )
        mock_exchange.return_value = VALID_TOKEN
        mock_get_user.return_value = GITHUB_USER

        auth = service.connect_github(str(self.user.id), "some-code")

        self.assertEqual(auth.id, existing.id)
        self.assertEqual(auth.github_login, "octocat")
        self.assertEqual(GithubAuth.objects.filter(user=self.user).count(), 1)

    @patch("github_auth.service.oauth_client.exchange_code_for_token")
    def test_no_access_token_raises_bad_request(self, mock_exchange):
        mock_exchange.return_value = {"access_token": None}
        with self.assertRaises(BadRequestException):
            service.connect_github(str(self.user.id), "some-code")

    @patch("github_auth.service.api_client.get_current_user")
    @patch("github_auth.service.oauth_client.exchange_code_for_token")
    def test_no_github_login_raises_bad_request(self, mock_exchange, mock_get_user):
        mock_exchange.return_value = VALID_TOKEN
        mock_get_user.return_value = {"id": 1, "login": None}
        with self.assertRaises(BadRequestException):
            service.connect_github(str(self.user.id), "some-code")

    @patch("github_auth.service.api_client.get_current_user")
    @patch("github_auth.service.oauth_client.exchange_code_for_token")
    def test_unknown_local_user_raises_not_found(self, mock_exchange, mock_get_user):
        import uuid

        mock_exchange.return_value = VALID_TOKEN
        mock_get_user.return_value = GITHUB_USER
        with self.assertRaises(NotFoundException):
            service.connect_github(str(uuid.uuid4()), "some-code")

    @patch("github_auth.service.api_client.get_current_user")
    @patch("github_auth.service.oauth_client.exchange_code_for_token")
    def test_github_account_linked_to_other_user_raises_conflict(self, mock_exchange, mock_get_user):
        other_user = AppUser.objects.create_user(email="other@example.com", password="password123", name="B")
        GithubAuth.objects.create(
            user=other_user, github_user_id=555, github_login="octocat", access_token="tok"
        )
        mock_exchange.return_value = VALID_TOKEN
        mock_get_user.return_value = GITHUB_USER

        with self.assertRaises(ConflictException):
            service.connect_github(str(self.user.id), "some-code")

    @patch("github_auth.service.api_client.get_current_user")
    @patch("github_auth.service.oauth_client.exchange_code_for_token")
    def test_reconnecting_same_user_same_github_account_is_not_a_conflict(self, mock_exchange, mock_get_user):
        GithubAuth.objects.create(
            user=self.user, github_user_id=555, github_login="octocat", access_token="old-tok"
        )
        mock_exchange.return_value = VALID_TOKEN
        mock_get_user.return_value = GITHUB_USER

        auth = service.connect_github(str(self.user.id), "some-code")  # must not raise
        self.assertEqual(auth.access_token, "gho_abc123")
