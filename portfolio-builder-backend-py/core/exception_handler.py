import logging
from datetime import datetime, timezone
from http import HTTPStatus

from rest_framework.exceptions import AuthenticationFailed, NotAuthenticated, Throttled
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_default_exception_handler

from core.exceptions import ApiException
from styles.exceptions import (
    RateLimitDailyExceededException,
    RateLimitMinuteExceededException,
    StyleGenerationFailedException,
    StyleGenerationTimeoutException,
    StyleProviderBusyException,
)

logger = logging.getLogger(__name__)


def _timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def _format_validation_errors(detail) -> str:
    """Flattens DRF's nested error structure into Java's "field: message" style,
    extended with dotted/indexed paths for nested serializers and many=True lists
    (e.g. "education.items[0].institution: Institution is required")."""
    parts = []

    def walk(node, path):
        if isinstance(node, dict):
            for key, value in node.items():
                child = path if key == "non_field_errors" else (f"{path}.{key}" if path else key)
                walk(value, child)
        elif isinstance(node, list) and node and isinstance(node[0], (dict, list)):
            for index, item in enumerate(node):
                if item:
                    walk(item, f"{path}[{index}]")
        elif isinstance(node, list):
            for msg in node:
                parts.append(str(msg) if not path else f"{path}: {msg}")
        else:
            parts.append(str(node) if not path else f"{path}: {node}")

    walk(detail, "")
    return ", ".join(parts)


def api_exception_handler(exc, context):
    request = context.get("request")
    path = request.path if request is not None else ""

    # Missing/invalid JWT on a protected endpoint — matches Spring Security's
    # authenticationEntryPoint short body (no timestamp/path).
    if isinstance(exc, (NotAuthenticated, AuthenticationFailed)):
        return Response(
            {"status": 401, "error": "Unauthorized", "message": "Authentication required"},
            status=401,
        )

    if isinstance(exc, Throttled):
        return Response(
            {
                "status": 429,
                "error": "Too Many Requests",
                "message": "Too many attempts. Please try again later.",
            },
            status=429,
        )

    # LLM style-generation failures — raw {error, message, ...} shape (no status/path/
    # timestamp), matching Java's separate LlmExceptionHandler advice. Checked before
    # ApiException since these are a distinct family with their own response contract.
    if isinstance(exc, RateLimitMinuteExceededException):
        response = Response(
            {
                "error": "rate_limit_minute",
                "message": f"Too many requests. Try again in {exc.retry_after_seconds} seconds.",
                "retryAfter": exc.retry_after_seconds,
            },
            status=429,
        )
        response["Retry-After"] = str(exc.retry_after_seconds)
        return response

    if isinstance(exc, RateLimitDailyExceededException):
        from django.conf import settings

        return Response(
            {
                "error": "rate_limit_daily",
                "message": f"You've used all {settings.LLM_RATE_PER_DAY} daily generations. Resets at midnight.",
                "resetsAt": exc.resets_at.isoformat(),
            },
            status=429,
        )

    if isinstance(exc, StyleProviderBusyException):
        response = Response(
            {
                "error": "service_busy",
                "message": "Style generation is temporarily busy. Try again in a moment.",
                "retryAfter": 30,
            },
            status=503,
        )
        response["Retry-After"] = "30"
        return response

    if isinstance(exc, StyleGenerationTimeoutException):
        return Response(
            {"error": "service_timeout", "message": "Style generation timed out. Try again."},
            status=504,
        )

    if isinstance(exc, StyleGenerationFailedException):
        return Response(
            {"error": "generation_failed", "message": "Could not generate a valid style. Try again."},
            status=500,
        )

    # Business-logic errors raised explicitly by views/services.
    if isinstance(exc, ApiException):
        return Response(
            {
                "status": exc.status_code,
                "error": HTTPStatus(exc.status_code).phrase,
                "message": exc.message,
                "path": path,
                "timestamp": _timestamp(),
            },
            status=exc.status_code,
        )

    if isinstance(exc, DRFValidationError):
        return Response(
            {
                "status": 400,
                "error": "Bad Request",
                "message": _format_validation_errors(exc.detail),
                "path": path,
                "timestamp": _timestamp(),
            },
            status=400,
        )

    response = drf_default_exception_handler(exc, context)
    if response is not None:
        return response

    logger.exception("Unexpected error at %s", path, exc_info=exc)
    return Response(
        {
            "status": 500,
            "error": "Internal Server Error",
            "message": "Something went wrong. Please try again.",
            "path": path,
            "timestamp": _timestamp(),
        },
        status=500,
    )
