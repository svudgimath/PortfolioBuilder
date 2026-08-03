from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APITestCase

from core import jwt_service


class AuthFlowEndToEndTests(APITestCase):
    """Chains signup -> login -> refresh through real HTTP requests against the
    real (test) database, the way the frontend actually uses the API."""

    def setUp(self):
        cache.clear()

    def test_signup_then_login_then_refresh(self):
        signup_resp = self.client.post(
            "/api/auth/signup",
            {"name": "Flow User", "email": "flow@example.com", "password": "password123"},
            format="json",
        )
        self.assertEqual(signup_resp.status_code, status.HTTP_200_OK)

        login_resp = self.client.post(
            "/api/auth/login",
            {"email": "flow@example.com", "password": "password123"},
            format="json",
        )
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        refresh_token = login_resp.data["refreshToken"]

        refresh_resp = self.client.post(
            "/api/auth/refresh", {"refreshToken": refresh_token}, format="json"
        )
        self.assertEqual(refresh_resp.status_code, status.HTTP_200_OK)
        # Note: a fresh access token can be byte-identical to the previous one if
        # issued within the same second (iat/exp have second granularity) — that's
        # expected JWT behavior, not a bug, so we assert validity rather than novelty.
        self.assertTrue(jwt_service.is_access_token(refresh_resp.data["accessToken"]))
        self.assertEqual(refresh_resp.data["refreshToken"], refresh_token)

    def test_signing_up_twice_then_logging_in_with_second_attempt_password_fails(self):
        self.client.post(
            "/api/auth/signup",
            {"name": "A", "email": "clash@example.com", "password": "firstpassword"},
            format="json",
        )
        conflict_resp = self.client.post(
            "/api/auth/signup",
            {"name": "B", "email": "clash@example.com", "password": "secondpassword"},
            format="json",
        )
        self.assertEqual(conflict_resp.status_code, status.HTTP_409_CONFLICT)

        login_resp = self.client.post(
            "/api/auth/login",
            {"email": "clash@example.com", "password": "secondpassword"},
            format="json",
        )
        self.assertEqual(login_resp.status_code, status.HTTP_401_UNAUTHORIZED)
