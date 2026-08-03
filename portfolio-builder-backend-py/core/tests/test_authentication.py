import uuid

from django.test import RequestFactory, TestCase

from accounts.models import AppUser
from core import jwt_service
from core.authentication import BearerJWTAuthentication


class BearerJWTAuthenticationTests(TestCase):
    def setUp(self):
        self.user = AppUser(email="auth-test@example.com", name="Auth Test")
        self.user.set_password("password123")
        self.user.save()
        self.auth = BearerJWTAuthentication()
        self.factory = RequestFactory()

    def _request(self, header_value=None):
        req = self.factory.get("/api/portfolio")
        if header_value is not None:
            req.META["HTTP_AUTHORIZATION"] = header_value
        return req

    def test_no_header_returns_none(self):
        self.assertIsNone(self.auth.authenticate(self._request()))

    def test_non_bearer_scheme_returns_none(self):
        self.assertIsNone(self.auth.authenticate(self._request("Token abc")))

    def test_valid_access_token_returns_user_and_token(self):
        token = jwt_service.generate_access_token(str(self.user.id), self.user.email)
        result = self.auth.authenticate(self._request(f"Bearer {token}"))
        self.assertIsNotNone(result)
        user, returned_token = result
        self.assertEqual(user.id, self.user.id)
        self.assertEqual(returned_token, token)

    def test_refresh_token_is_rejected(self):
        token = jwt_service.generate_refresh_token(str(self.user.id), self.user.email)
        self.assertIsNone(self.auth.authenticate(self._request(f"Bearer {token}")))

    def test_malformed_token_returns_none(self):
        self.assertIsNone(self.auth.authenticate(self._request("Bearer not-a-jwt")))

    def test_valid_token_for_unknown_user_returns_none(self):
        token = jwt_service.generate_access_token(str(uuid.uuid4()), "ghost@example.com")
        self.assertIsNone(self.auth.authenticate(self._request(f"Bearer {token}")))
