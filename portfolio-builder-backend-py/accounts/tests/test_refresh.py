from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import AppUser
from core import jwt_service


class RefreshIntegrationTests(APITestCase):
    url = "/api/auth/refresh"

    def setUp(self):
        cache.clear()
        self.user = AppUser.objects.create_user(
            email="refresh-test@example.com", password="password123", name="Refresh Test"
        )

    def test_valid_refresh_token_returns_new_access_token(self):
        refresh_token = jwt_service.generate_refresh_token(str(self.user.id), self.user.email)
        response = self.client.post(self.url, {"refreshToken": refresh_token}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("accessToken", response.data)
        self.assertEqual(response.data["refreshToken"], refresh_token)
        self.assertIsNone(response.data["name"])
        self.assertEqual(response.data["email"], self.user.email)

    def test_missing_token_returns_400(self):
        response = self.client.post(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["message"], "refreshToken is required")

    def test_blank_token_returns_400(self):
        response = self.client.post(self.url, {"refreshToken": ""}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_garbage_token_returns_401(self):
        response = self.client.post(self.url, {"refreshToken": "not-a-real-token"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["message"], "Invalid refresh token")

    def test_access_token_used_as_refresh_is_rejected(self):
        access_token = jwt_service.generate_access_token(str(self.user.id), self.user.email)
        response = self.client.post(self.url, {"refreshToken": access_token}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["message"], "Invalid token type")

    def test_new_access_token_is_valid_and_for_the_same_user(self):
        refresh_token = jwt_service.generate_refresh_token(str(self.user.id), self.user.email)
        response = self.client.post(self.url, {"refreshToken": refresh_token}, format="json")
        new_access = response.data["accessToken"]
        self.assertTrue(jwt_service.is_access_token(new_access))
        self.assertEqual(jwt_service.get_user_id_from_token(new_access), str(self.user.id))
