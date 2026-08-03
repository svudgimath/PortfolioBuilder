import time

import jwt as pyjwt
from django.test import SimpleTestCase, override_settings

from core import jwt_service


class JwtServiceTests(SimpleTestCase):
    def test_generate_access_token_has_expected_claims(self):
        token = jwt_service.generate_access_token("user-123", "user@example.com")
        payload = jwt_service.parse_token(token)
        self.assertEqual(payload["sub"], "user-123")
        self.assertEqual(payload["email"], "user@example.com")
        self.assertEqual(payload["type"], "access")
        self.assertIn("iat", payload)
        self.assertIn("exp", payload)

    def test_generate_refresh_token_type(self):
        token = jwt_service.generate_refresh_token("user-123", "user@example.com")
        self.assertEqual(jwt_service.get_token_type(token), "refresh")

    def test_is_access_token_true_for_access(self):
        token = jwt_service.generate_access_token("u1", "e@x.com")
        self.assertTrue(jwt_service.is_access_token(token))

    def test_is_access_token_false_for_refresh(self):
        token = jwt_service.generate_refresh_token("u1", "e@x.com")
        self.assertFalse(jwt_service.is_access_token(token))

    def test_is_token_valid_true_for_well_formed_token(self):
        token = jwt_service.generate_access_token("u1", "e@x.com")
        self.assertTrue(jwt_service.is_token_valid(token))

    def test_is_token_valid_false_for_garbage(self):
        self.assertFalse(jwt_service.is_token_valid("not-a-real-token"))

    def test_is_token_valid_false_for_wrong_signature(self):
        token = pyjwt.encode({"sub": "u1"}, "some-other-secret", algorithm="HS256")
        self.assertFalse(jwt_service.is_token_valid(token))

    @override_settings(JWT_ACCESS_EXPIRATION_SECONDS=0)
    def test_expired_token_is_invalid(self):
        token = jwt_service.generate_access_token("u1", "e@x.com")
        time.sleep(1)
        self.assertFalse(jwt_service.is_token_valid(token))

    def test_get_user_id_from_token(self):
        token = jwt_service.generate_access_token("abc-uuid", "e@x.com")
        self.assertEqual(jwt_service.get_user_id_from_token(token), "abc-uuid")

    def test_get_token_type_returns_none_for_invalid_token(self):
        self.assertIsNone(jwt_service.get_token_type("garbage"))

    def test_access_and_refresh_tokens_differ(self):
        access = jwt_service.generate_access_token("u1", "e@x.com")
        refresh = jwt_service.generate_refresh_token("u1", "e@x.com")
        self.assertNotEqual(access, refresh)
