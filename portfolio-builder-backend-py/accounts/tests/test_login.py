from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import AppUser
from core import jwt_service


class LoginIntegrationTests(APITestCase):
    url = "/api/auth/login"

    def setUp(self):
        cache.clear()
        self.user = AppUser.objects.create_user(
            email="login-test@example.com", password="password123", name="Login Test"
        )

    def test_correct_credentials_returns_tokens(self):
        response = self.client.post(
            self.url, {"email": "login-test@example.com", "password": "password123"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("accessToken", response.data)
        self.assertIn("refreshToken", response.data)
        self.assertEqual(response.data["email"], "login-test@example.com")
        self.assertEqual(response.data["name"], "Login Test")

    def test_wrong_password_returns_401(self):
        response = self.client.post(
            self.url, {"email": "login-test@example.com", "password": "wrongpassword"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["message"], "Invalid email or password")

    def test_unknown_email_returns_401_not_500(self):
        """Behavior fix vs. the Java backend, where an unknown email fell through
        to the generic 500 handler instead of a clean 401."""
        response = self.client.post(
            self.url, {"email": "ghost@example.com", "password": "whatever1"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["message"], "Invalid email or password")

    def test_missing_password_returns_400(self):
        response = self.client.post(self.url, {"email": "login-test@example.com"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_email_returns_400(self):
        response = self.client.post(self.url, {"password": "password123"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_is_case_insensitive_on_email(self):
        response = self.client.post(
            self.url, {"email": "LOGIN-TEST@example.com", "password": "password123"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_access_token_from_login_decodes_to_this_user(self):
        response = self.client.post(
            self.url, {"email": "login-test@example.com", "password": "password123"}, format="json"
        )
        access_token = response.data["accessToken"]
        self.assertEqual(jwt_service.get_user_id_from_token(access_token), str(self.user.id))
        self.assertTrue(jwt_service.is_access_token(access_token))
