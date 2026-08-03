from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APITestCase


class AuthRateLimitTests(APITestCase):
    """10 requests/minute per client IP across all /api/auth/** views (shared bucket)."""

    login_url = "/api/auth/login"
    signup_url = "/api/auth/signup"

    def setUp(self):
        cache.clear()

    def test_requests_up_to_the_limit_are_not_throttled(self):
        for _ in range(10):
            response = self.client.post(
                self.login_url, {"email": "x@example.com", "password": "x"}, format="json"
            )
            self.assertNotEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_request_beyond_the_limit_is_throttled(self):
        for _ in range(10):
            self.client.post(self.login_url, {"email": "x@example.com", "password": "x"}, format="json")

        response = self.client.post(
            self.login_url, {"email": "x@example.com", "password": "x"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(
            response.data,
            {
                "status": 429,
                "error": "Too Many Requests",
                "message": "Too many attempts. Please try again later.",
            },
        )

    def test_throttle_bucket_is_shared_across_auth_endpoints(self):
        for _ in range(10):
            self.client.post(
                self.signup_url,
                {"name": "x", "email": "dup@example.com", "password": "password123"},
                format="json",
            )

        response = self.client.post(
            self.login_url, {"email": "x@example.com", "password": "x"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
