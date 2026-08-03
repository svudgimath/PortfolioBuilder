from django.test import SimpleTestCase
from rest_framework.exceptions import AuthenticationFailed, NotAuthenticated, Throttled
from rest_framework.exceptions import ValidationError as DRFValidationError

from core.exception_handler import _format_validation_errors, api_exception_handler
from core.exceptions import (
    BadRequestException,
    ConflictException,
    NotFoundException,
    UnauthorizedException,
)


class FakeRequest:
    def __init__(self, path):
        self.path = path


def _ctx(path="/api/auth/login"):
    return {"request": FakeRequest(path)}


class ApiExceptionHandlingTests(SimpleTestCase):
    def test_conflict_exception_shape(self):
        response = api_exception_handler(
            ConflictException("Email already registered"), _ctx("/api/auth/signup")
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["status"], 409)
        self.assertEqual(response.data["error"], "Conflict")
        self.assertEqual(response.data["message"], "Email already registered")
        self.assertEqual(response.data["path"], "/api/auth/signup")
        self.assertIn("timestamp", response.data)

    def test_unauthorized_exception_has_full_shape_with_timestamp(self):
        response = api_exception_handler(
            UnauthorizedException("Invalid email or password"), _ctx("/api/auth/login")
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["message"], "Invalid email or password")
        self.assertIn("timestamp", response.data)
        self.assertIn("path", response.data)

    def test_not_found_exception_shape(self):
        response = api_exception_handler(NotFoundException("Portfolio not found"), _ctx("/api/portfolio"))
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["error"], "Not Found")

    def test_bad_request_exception_shape(self):
        response = api_exception_handler(
            BadRequestException("refreshToken is required"), _ctx("/api/auth/refresh")
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Bad Request")


class ShortCircuitedAuthResponseTests(SimpleTestCase):
    """NotAuthenticated/AuthenticationFailed get the short body (no timestamp/path),
    mirroring Spring Security's authenticationEntryPoint — distinct from the
    business-logic UnauthorizedException case above."""

    def test_not_authenticated_short_shape(self):
        response = api_exception_handler(NotAuthenticated(), _ctx("/api/portfolio"))
        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.data,
            {"status": 401, "error": "Unauthorized", "message": "Authentication required"},
        )

    def test_authentication_failed_short_shape(self):
        response = api_exception_handler(AuthenticationFailed(), _ctx("/api/portfolio"))
        self.assertEqual(response.data["message"], "Authentication required")
        self.assertNotIn("timestamp", response.data)


class ThrottledResponseTests(SimpleTestCase):
    def test_throttled_shape(self):
        response = api_exception_handler(Throttled(wait=30), _ctx("/api/auth/login"))
        self.assertEqual(response.status_code, 429)
        self.assertEqual(
            response.data,
            {
                "status": 429,
                "error": "Too Many Requests",
                "message": "Too many attempts. Please try again later.",
            },
        )


class ValidationErrorFormattingTests(SimpleTestCase):
    def test_validation_error_joins_field_messages(self):
        exc = DRFValidationError(
            {
                "email": ["Invalid email format"],
                "password": ["Password must be at least 8 characters"],
            }
        )
        response = api_exception_handler(exc, _ctx("/api/auth/signup"))
        self.assertEqual(response.status_code, 400)
        self.assertIn("email: Invalid email format", response.data["message"])
        self.assertIn("password: Password must be at least 8 characters", response.data["message"])

    def test_format_validation_errors_nested_dict(self):
        msg = _format_validation_errors({"meta": {"displayName": ["Display name is required"]}})
        self.assertEqual(msg, "meta.displayName: Display name is required")

    def test_format_validation_errors_list_of_items(self):
        msg = _format_validation_errors(
            {"education": {"items": [{}, {"institution": ["Institution is required"]}]}}
        )
        self.assertEqual(msg, "education.items[1].institution: Institution is required")

    def test_format_validation_errors_non_field(self):
        msg = _format_validation_errors(
            {"non_field_errors": ["Provide at least an email or phone number."]}
        )
        self.assertEqual(msg, "Provide at least an email or phone number.")

    def test_format_validation_errors_list_detail(self):
        msg = _format_validation_errors(["Something bad"])
        self.assertEqual(msg, "Something bad")

    def test_format_validation_errors_plain_string(self):
        msg = _format_validation_errors("Something bad")
        self.assertEqual(msg, "Something bad")


class UnhandledExceptionFallbackTests(SimpleTestCase):
    def test_generic_exception_falls_back_to_500(self):
        try:
            raise RuntimeError("boom")
        except RuntimeError as exc:
            response = api_exception_handler(exc, _ctx("/api/auth/login"))

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.data["message"], "Something went wrong. Please try again.")
        self.assertEqual(response.data["error"], "Internal Server Error")
        self.assertIn("timestamp", response.data)
