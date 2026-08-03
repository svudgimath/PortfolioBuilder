import io
import uuid
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from reportlab.pdfgen import canvas
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import AppUser
from core import jwt_service
from core.mongo import get_db
from portfolio.repository import PortfolioRepository


def _make_pdf(lines):
    buf = io.BytesIO()
    c = canvas.Canvas(buf)
    y = 750
    for line in lines:
        c.drawString(72, y, line)
        y -= 20
    c.save()
    return buf.getvalue()


VALID_RESUME_PDF = _make_pdf([f"Line {i} of a reasonably long resume with real content." for i in range(20)])


class ResumeViewTestsBase(APITestCase):
    def setUp(self):
        self.user = AppUser.objects.create_user(
            email=f"resume-{uuid.uuid4()}@example.com", password="password123", name="Resume Tester"
        )
        self.user_id = str(self.user.id)
        token = jwt_service.generate_access_token(str(self.user.id), self.user.email)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def tearDown(self):
        get_db()["portfolios"].delete_many({"userId": self.user_id})


class ParseResumeViewTests(ResumeViewTestsBase):
    url = "/api/portfolio/parse-resume"

    def test_requires_authentication(self):
        self.client.credentials()
        response = self.client.post(self.url, {}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_missing_file_returns_400(self):
        response = self.client.post(self.url, {}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_pdf_upload_returns_400(self):
        upload = SimpleUploadedFile("resume.txt", b"just text", content_type="text/plain")
        response = self.client.post(self.url, {"file": upload}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Only PDF files", response.data["message"])

    @patch("portfolio.llm.resume_parser._get_client")
    def test_successful_parse_returns_prefill_payload(self, mock_get_client):
        from unittest.mock import MagicMock

        resp = MagicMock()
        resp.text = '{"meta": {"displayName": "Jane Doe"}}'
        mock_get_client.return_value.models.generate_content.return_value = resp

        upload = SimpleUploadedFile("resume.pdf", VALID_RESUME_PDF, content_type="application/pdf")
        response = self.client.post(self.url, {"file": upload}, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["meta"]["displayName"], "Jane Doe")

    def test_parse_does_not_persist_anything(self):
        """Parsing is a preview step — nothing should be saved to Mongo."""
        with patch("portfolio.llm.resume_parser._get_client") as mock_get_client:
            from unittest.mock import MagicMock

            resp = MagicMock()
            resp.text = '{"meta": {"displayName": "Jane Doe"}}'
            mock_get_client.return_value.models.generate_content.return_value = resp

            upload = SimpleUploadedFile("resume.pdf", VALID_RESUME_PDF, content_type="application/pdf")
            self.client.post(self.url, {"file": upload}, format="multipart")

        self.assertIsNone(PortfolioRepository().find_by_user_id(self.user_id))


class ApplyResumeViewTests(ResumeViewTestsBase):
    url = "/api/portfolio/apply-resume"

    def test_requires_authentication(self):
        self.client.credentials()
        response = self.client.post(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_empty_body_is_valid_and_creates_empty_portfolio(self):
        response = self.client.post(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["meta"])

    def test_applies_selected_sections(self):
        response = self.client.post(
            self.url,
            {"meta": {"displayName": "Jane Doe"}, "experience": {"items": [{"company": "Acme"}]}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["meta"]["displayName"], "Jane Doe")
        self.assertEqual(response.data["experience"]["items"][0]["company"], "Acme")

    def test_does_not_touch_untouched_sections(self):
        PortfolioRepository().update_section(self.user_id, "hero", {"greeting": "Hi"})
        response = self.client.post(self.url, {"meta": {"displayName": "Jane Doe"}}, format="json")
        self.assertEqual(response.data["hero"]["greeting"], "Hi")
        self.assertEqual(response.data["meta"]["displayName"], "Jane Doe")

    def test_invalid_section_data_returns_400(self):
        # meta.displayName is required when meta is provided at all
        response = self.client.post(self.url, {"meta": {}}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_testimonials_key_is_not_accepted(self):
        """ResumeParseResult has no testimonials field — the serializer should
        simply ignore an unexpected key rather than erroring or applying it."""
        response = self.client.post(
            self.url, {"testimonials": {"items": [{"name": "X", "message": "hi"}]}}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["testimonials"])
