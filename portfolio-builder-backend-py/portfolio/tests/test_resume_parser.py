import io
import json
from unittest.mock import MagicMock, patch

import httpx
from django.test import SimpleTestCase
from google.genai import errors
from reportlab.pdfgen import canvas

from core.exceptions import (
    BadGatewayException,
    BadRequestException,
    GatewayTimeoutException,
    ServiceUnavailableException,
    TooManyRequestsException,
)
from portfolio.llm import resume_parser


def _make_pdf(lines: list[str]) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf)
    y = 750
    for line in lines:
        c.drawString(72, y, line)
        y -= 20
    c.save()
    return buf.getvalue()


LONG_RESUME_TEXT = [f"Line {i} of a reasonably long resume with real content." for i in range(20)]
VALID_RESUME_PDF = _make_pdf(LONG_RESUME_TEXT)
SHORT_PDF = _make_pdf(["short"])

VALID_PARSE_JSON = json.dumps({"meta": {"displayName": "Jane Doe"}, "experience": {"items": [{"company": "Acme"}]}})


def _api_error(code):
    err = errors.APIError.__new__(errors.APIError)
    err.code = code
    err.message = "boom"
    err.status = "ERROR"
    err.details = {}
    return err


def _mock_client(text_sequence):
    client = MagicMock()
    responses = []
    for item in text_sequence:
        if isinstance(item, Exception):
            responses.append(item)
        else:
            resp = MagicMock()
            resp.text = item
            responses.append(resp)

    def side_effect(*args, **kwargs):
        result = responses.pop(0)
        if isinstance(result, Exception):
            raise result
        return result

    client.models.generate_content.side_effect = side_effect
    return client


class ValidateContentTypeTests(SimpleTestCase):
    def test_none_content_type_rejected(self):
        with self.assertRaises(BadRequestException):
            resume_parser._validate_content_type(None)

    def test_non_pdf_content_type_rejected(self):
        with self.assertRaises(BadRequestException):
            resume_parser._validate_content_type("image/jpeg")

    def test_pdf_content_type_accepted(self):
        resume_parser._validate_content_type("application/pdf")  # must not raise


class ExtractTextTests(SimpleTestCase):
    def test_extracts_real_text_from_valid_pdf(self):
        text = resume_parser._extract_text(VALID_RESUME_PDF)
        self.assertIn("Line 0 of a reasonably long resume", text)

    def test_corrupted_bytes_raise_bad_request(self):
        with self.assertRaises(BadRequestException):
            resume_parser._extract_text(b"not a real pdf")


class TruncTests(SimpleTestCase):
    def test_none_passes_through(self):
        self.assertIsNone(resume_parser._trunc(None, 10))

    def test_under_limit_unchanged(self):
        self.assertEqual(resume_parser._trunc("short", 10), "short")

    def test_cuts_at_word_boundary(self):
        value = "a" * 50 + " " + "b" * 50
        result = resume_parser._trunc(value, 60)
        self.assertEqual(result, "a" * 50)

    def test_hard_cut_when_no_word_boundary_past_half(self):
        value = "a" * 100
        result = resume_parser._trunc(value, 60)
        self.assertEqual(result, "a" * 60)


class SanitizeTests(SimpleTestCase):
    def test_truncates_meta_fields(self):
        result = {"meta": {"displayName": "x" * 300}}
        resume_parser._sanitize(result)
        self.assertLessEqual(len(result["meta"]["displayName"]), 200)

    def test_truncates_nested_experience_items(self):
        result = {"experience": {"items": [{"company": "x" * 300, "description": ["y" * 3000]}]}}
        resume_parser._sanitize(result)
        item = result["experience"]["items"][0]
        self.assertLessEqual(len(item["company"]), 200)
        self.assertLessEqual(len(item["description"][0]), 2000)

    def test_missing_sections_are_skipped_without_error(self):
        resume_parser._sanitize({})  # must not raise

    def test_null_sections_are_skipped(self):
        resume_parser._sanitize({"meta": None, "experience": None})  # must not raise


class AssignIdsTests(SimpleTestCase):
    def test_assigns_ids_to_items_missing_them(self):
        result = {"experience": {"items": [{"company": "Acme"}]}}
        resume_parser._assign_ids(result)
        self.assertIsNotNone(result["experience"]["items"][0]["id"])

    def test_preserves_existing_ids(self):
        result = {"projects": {"items": [{"id": "existing-id"}]}}
        resume_parser._assign_ids(result)
        self.assertEqual(result["projects"]["items"][0]["id"], "existing-id")

    def test_sections_without_items_are_skipped(self):
        resume_parser._assign_ids({"meta": {"displayName": "Jane"}})  # must not raise

    def test_all_five_item_sections_get_ids(self):
        result = {
            "experience": {"items": [{}]},
            "education": {"items": [{}]},
            "projects": {"items": [{}]},
            "certifications": {"items": [{}]},
            "research": {"items": [{}]},
        }
        resume_parser._assign_ids(result)
        for section in result.values():
            self.assertIsNotNone(section["items"][0]["id"])


class CallModelExceptionMappingTests(SimpleTestCase):
    @patch("portfolio.llm.resume_parser._get_client")
    def test_success_returns_text(self, mock_get_client):
        mock_get_client.return_value = _mock_client([VALID_PARSE_JSON])
        text = resume_parser._call_model("resume text")
        self.assertEqual(text, VALID_PARSE_JSON)

    @patch("portfolio.llm.resume_parser._get_client")
    def test_429_retries_then_succeeds(self, mock_get_client):
        mock_get_client.return_value = _mock_client([_api_error(429), VALID_PARSE_JSON])
        with patch("portfolio.llm.resume_parser.time.sleep") as mock_sleep:
            text = resume_parser._call_model("resume text")
        self.assertEqual(text, VALID_PARSE_JSON)
        mock_sleep.assert_called_once_with(5)

    @patch("portfolio.llm.resume_parser._get_client")
    def test_429_exhausted_raises_too_many_requests(self, mock_get_client):
        mock_get_client.return_value = _mock_client([_api_error(429)] * 5)
        with patch("portfolio.llm.resume_parser.time.sleep"):
            with self.assertRaises(TooManyRequestsException):
                resume_parser._call_model("resume text")

    @patch("portfolio.llm.resume_parser._get_client")
    def test_503_raises_service_unavailable(self, mock_get_client):
        mock_get_client.return_value = _mock_client([_api_error(503)])
        with self.assertRaises(ServiceUnavailableException):
            resume_parser._call_model("resume text")

    @patch("portfolio.llm.resume_parser._get_client")
    def test_other_api_error_raises_bad_gateway(self, mock_get_client):
        mock_get_client.return_value = _mock_client([_api_error(500)])
        with self.assertRaises(BadGatewayException):
            resume_parser._call_model("resume text")

    @patch("portfolio.llm.resume_parser._get_client")
    def test_timeout_raises_gateway_timeout(self, mock_get_client):
        mock_get_client.return_value = _mock_client([httpx.TimeoutException("timed out")])
        with self.assertRaises(GatewayTimeoutException):
            resume_parser._call_model("resume text")

    @patch("portfolio.llm.resume_parser._get_client")
    def test_blank_response_raises_bad_gateway(self, mock_get_client):
        mock_get_client.return_value = _mock_client([""])
        with self.assertRaises(BadGatewayException):
            resume_parser._call_model("resume text")


class ParseEndToEndTests(SimpleTestCase):
    @patch("portfolio.llm.resume_parser._get_client")
    def test_full_parse_flow(self, mock_get_client):
        mock_get_client.return_value = _mock_client([VALID_PARSE_JSON])
        result = resume_parser.parse(VALID_RESUME_PDF, "application/pdf")
        self.assertEqual(result["meta"]["displayName"], "Jane Doe")
        self.assertIsNotNone(result["experience"]["items"][0]["id"])  # id assigned

    def test_wrong_content_type_rejected_before_extraction(self):
        with self.assertRaises(BadRequestException):
            resume_parser.parse(VALID_RESUME_PDF, "image/png")

    def test_too_short_text_rejected(self):
        with self.assertRaises(BadRequestException) as ctx:
            resume_parser.parse(SHORT_PDF, "application/pdf")
        self.assertIn("Scanned/image-only PDFs", ctx.exception.message)

    @patch("portfolio.llm.resume_parser._get_client")
    def test_malformed_model_response_raises_bad_gateway(self, mock_get_client):
        mock_get_client.return_value = _mock_client(["not valid json"])
        with self.assertRaises(BadGatewayException):
            resume_parser.parse(VALID_RESUME_PDF, "application/pdf")
