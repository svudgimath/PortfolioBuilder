from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import AppUser


class SignupIntegrationTests(APITestCase):
    url = "/api/auth/signup"

    def setUp(self):
        cache.clear()

    def test_signup_success_returns_tokens(self):
        response = self.client.post(
            self.url,
            {"name": "New User", "email": "new-user@example.com", "password": "password123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("accessToken", response.data)
        self.assertIn("refreshToken", response.data)
        self.assertEqual(response.data["name"], "New User")
        self.assertEqual(response.data["email"], "new-user@example.com")

    def test_signup_persists_user_with_hashed_password(self):
        self.client.post(
            self.url,
            {"name": "New User", "email": "persist@example.com", "password": "password123"},
            format="json",
        )
        user = AppUser.objects.get(email="persist@example.com")
        self.assertTrue(user.check_password("password123"))

    def test_duplicate_email_returns_409(self):
        AppUser.objects.create_user(email="dupe@example.com", password="password123", name="Existing")
        response = self.client.post(
            self.url,
            {"name": "New User", "email": "dupe@example.com", "password": "password123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["message"], "Email already registered")

    def test_duplicate_email_is_case_insensitive(self):
        AppUser.objects.create_user(email="CaseTest@example.com", password="password123", name="Existing")
        response = self.client.post(
            self.url,
            {"name": "New User", "email": "casetest@example.com", "password": "password123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_missing_name_returns_400(self):
        response = self.client.post(
            self.url,
            {"email": "noname@example.com", "password": "password123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Name is required", response.data["message"])

    def test_invalid_email_format_returns_400(self):
        response = self.client.post(
            self.url,
            {"name": "X", "email": "not-an-email", "password": "password123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid email format", response.data["message"])

    def test_short_password_returns_400(self):
        response = self.client.post(
            self.url,
            {"name": "X", "email": "shortpw@example.com", "password": "short"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Password must be at least 8 characters", response.data["message"])

    def test_multiple_validation_errors_are_all_joined(self):
        response = self.client.post(
            self.url,
            {"email": "bad-email", "password": "short"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        message = response.data["message"]
        self.assertIn("name", message)
        self.assertIn("email", message)
        self.assertIn("password", message)

    def test_error_response_has_full_shape(self):
        response = self.client.post(self.url, {"email": "bad", "password": "short"}, format="json")
        for key in ("status", "error", "message", "path", "timestamp"):
            self.assertIn(key, response.data)
        self.assertEqual(response.data["path"], "/api/auth/signup")

    def test_duplicate_check_does_not_preempt_validation_errors(self):
        """Java validates all fields (400) before checking for a duplicate email (409) —
        the Python port must preserve that ordering."""
        AppUser.objects.create_user(email="ordering@example.com", password="password123", name="Existing")
        response = self.client.post(
            self.url,
            {"name": "X", "email": "ordering@example.com", "password": "short"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
