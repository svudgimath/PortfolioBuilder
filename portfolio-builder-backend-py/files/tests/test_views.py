import io
import uuid
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import AppUser
from core import jwt_service

JPEG_BYTES = bytes([0xFF, 0xD8, 0xFF, 0xE0]) + b"restofjpeg" * 10
PDF_BYTES = b"%PDF-1.4" + b"restofpdf" * 10


class FileViewTestsBase(APITestCase):
    def setUp(self):
        self.user = AppUser.objects.create_user(
            email=f"files-{uuid.uuid4()}@example.com", password="password123", name="Files Tester"
        )
        token = jwt_service.generate_access_token(str(self.user.id), self.user.email)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")


class FileUploadViewTests(FileViewTestsBase):
    url = "/api/files/upload"

    def test_requires_authentication(self):
        self.client.credentials()
        response = self.client.post(self.url, {}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_missing_file_returns_400(self):
        response = self.client.post(self.url, {}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_oversized_file_returns_400(self):
        big = SimpleUploadedFile("big.jpg", JPEG_BYTES + b"0" * (5 * 1024 * 1024), content_type="image/jpeg")
        response = self.client.post(self.url, {"file": big}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("File size exceeds 5MB limit", response.data["message"])

    def test_disallowed_declared_type_returns_400(self):
        upload = SimpleUploadedFile("script.js", b"console.log(1)", content_type="application/javascript")
        response = self.client.post(self.url, {"file": upload}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("File type not allowed", response.data["message"])

    @patch("files.service.cloudinary.uploader.upload")
    def test_corrupted_bytes_returns_400_despite_valid_declared_type(self, mock_upload):
        upload = SimpleUploadedFile("photo.jpg", b"not a real jpeg", content_type="image/jpeg")
        response = self.client.post(self.url, {"file": upload}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Unsupported or corrupted file", response.data["message"])
        mock_upload.assert_not_called()

    @patch("files.service.cloudinary.uploader.upload")
    def test_successful_upload_returns_expected_shape(self, mock_upload):
        mock_upload.return_value = {
            "secure_url": f"https://res.cloudinary.com/demo/image/upload/v1/dzigned/users/{self.user.id}/photo.jpg",
            "public_id": f"dzigned/users/{self.user.id}/photo",
            "resource_type": "image",
            "bytes": len(JPEG_BYTES),
        }
        upload = SimpleUploadedFile("photo.jpg", JPEG_BYTES, content_type="image/jpeg")

        response = self.client.post(self.url, {"file": upload}, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["contentType"], "image/jpeg")
        self.assertEqual(response.data["filename"], "photo.jpg")
        self.assertIn("url", response.data)
        self.assertIn("publicId", response.data)

    @patch("files.service.cloudinary.uploader.upload")
    def test_pdf_upload_succeeds(self, mock_upload):
        mock_upload.return_value = {
            "secure_url": "https://res.cloudinary.com/demo/raw/upload/v1/dzigned/users/u1/resume.pdf",
            "public_id": "dzigned/users/u1/resume",
            "resource_type": "raw",
            "bytes": len(PDF_BYTES),
        }
        upload = SimpleUploadedFile("resume.pdf", PDF_BYTES, content_type="application/pdf")

        response = self.client.post(self.url, {"file": upload}, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["contentType"], "application/pdf")

    @patch("files.service.cloudinary.uploader.upload")
    def test_cloudinary_failure_returns_502(self, mock_upload):
        mock_upload.side_effect = Exception("network error")
        upload = SimpleUploadedFile("photo.jpg", JPEG_BYTES, content_type="image/jpeg")

        response = self.client.post(self.url, {"file": upload}, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(response.data["message"], "File upload failed. Please try again.")


class FileDeleteViewTests(FileViewTestsBase):
    url = "/api/files"

    def test_requires_authentication(self):
        self.client.credentials()
        response = self.client.delete(self.url, {"publicId": "x"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_missing_public_id_returns_400(self):
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("files.service.cloudinary.uploader.destroy")
    def test_delete_success_returns_204(self, mock_destroy):
        response = self.client.delete(f"{self.url}?publicId=dzigned/users/u1/photo&resourceType=image")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        mock_destroy.assert_called_once_with(
            "dzigned/users/u1/photo", resource_type="image", invalidate=True
        )

    @patch("files.service.cloudinary.uploader.destroy")
    def test_delete_defaults_resource_type_to_image(self, mock_destroy):
        response = self.client.delete(f"{self.url}?publicId=dzigned/users/u1/resume")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        mock_destroy.assert_called_once_with(
            "dzigned/users/u1/resume", resource_type="image", invalidate=True
        )

    @patch("files.service.cloudinary.uploader.destroy")
    def test_cloudinary_delete_failure_still_returns_204(self, mock_destroy):
        """delete() is best-effort — a Cloudinary-side failure must not surface as an error."""
        mock_destroy.side_effect = Exception("boom")
        response = self.client.delete(f"{self.url}?publicId=dzigned/users/u1/photo")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
