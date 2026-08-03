from unittest.mock import patch

from django.test import SimpleTestCase

from core.exceptions import BadGatewayException, BadRequestException
from files import service

JPEG_BYTES = bytes([0xFF, 0xD8, 0xFF, 0xE0]) + b"restofjpeg"
PDF_BYTES = b"%PDF-1.4" + b"restofpdf"


class StoreTests(SimpleTestCase):
    @patch("files.service.cloudinary.uploader.upload")
    def test_store_success_returns_expected_shape(self, mock_upload):
        mock_upload.return_value = {
            "secure_url": "https://res.cloudinary.com/demo/image/upload/v1/dzigned/users/u1/photo.jpg",
            "public_id": "dzigned/users/u1/photo",
            "resource_type": "image",
            "bytes": 12345,
        }

        result = service.store(JPEG_BYTES, "photo.jpg", "image/jpeg", "u1")

        self.assertEqual(result["url"], mock_upload.return_value["secure_url"])
        self.assertEqual(result["publicId"], "dzigned/users/u1/photo")
        self.assertEqual(result["resourceType"], "image")
        self.assertEqual(result["contentType"], "image/jpeg")
        self.assertEqual(result["filename"], "photo.jpg")
        self.assertEqual(result["bytes"], 12345)

    @patch("files.service.cloudinary.uploader.upload")
    def test_store_passes_expected_upload_options(self, mock_upload):
        mock_upload.return_value = {
            "secure_url": "u", "public_id": "p", "resource_type": "image", "bytes": 1,
        }

        service.store(JPEG_BYTES, "photo.jpg", "image/jpeg", "user-123")

        _, kwargs = mock_upload.call_args
        self.assertEqual(kwargs["resource_type"], "image")
        self.assertEqual(kwargs["folder"], "dzigned/users/user-123")
        self.assertTrue(kwargs["use_filename"])
        self.assertTrue(kwargs["unique_filename"])
        self.assertFalse(kwargs["overwrite"])
        self.assertEqual(kwargs["tags"], ["dzigned", "userId:user-123"])

    @patch("files.service.cloudinary.uploader.upload")
    def test_pdf_upload_forces_raw_resource_type(self, mock_upload):
        # "auto" would classify a PDF under Cloudinary's "image" resource type,
        # whose direct-delivery is blocked by default on newer accounts —
        # PDFs must go through as "raw" so the download link actually works.
        mock_upload.return_value = {
            "secure_url": "u", "public_id": "p", "resource_type": "raw", "bytes": 1,
        }

        service.store(PDF_BYTES, "resume.pdf", "application/pdf", "user-123")

        _, kwargs = mock_upload.call_args
        self.assertEqual(kwargs["resource_type"], "raw")

    def test_store_rejects_corrupted_bytes_before_calling_cloudinary(self):
        with patch("files.service.cloudinary.uploader.upload") as mock_upload:
            with self.assertRaises(BadRequestException):
                service.store(b"not a real image", "x.jpg", "image/jpeg", "u1")
            mock_upload.assert_not_called()

    @patch("files.service.cloudinary.uploader.upload")
    def test_store_wraps_cloudinary_failure_as_bad_gateway(self, mock_upload):
        mock_upload.side_effect = Exception("network error")
        with self.assertRaises(BadGatewayException) as ctx:
            service.store(JPEG_BYTES, "photo.jpg", "image/jpeg", "u1")
        self.assertEqual(ctx.exception.message, "File upload failed. Please try again.")
        self.assertEqual(ctx.exception.status_code, 502)


class DeleteTests(SimpleTestCase):
    @patch("files.service.cloudinary.uploader.destroy")
    def test_delete_calls_destroy_with_expected_options(self, mock_destroy):
        service.delete("dzigned/users/u1/photo", "image")
        mock_destroy.assert_called_once_with("dzigned/users/u1/photo", resource_type="image", invalidate=True)

    @patch("files.service.cloudinary.uploader.destroy")
    def test_delete_defaults_resource_type_to_image(self, mock_destroy):
        service.delete("dzigned/users/u1/photo", None)
        mock_destroy.assert_called_once_with("dzigned/users/u1/photo", resource_type="image", invalidate=True)

    @patch("files.service.cloudinary.uploader.destroy")
    def test_delete_blank_public_id_is_a_noop(self, mock_destroy):
        service.delete("", "image")
        service.delete(None, "image")
        mock_destroy.assert_not_called()

    @patch("files.service.cloudinary.uploader.destroy")
    def test_delete_swallows_cloudinary_exceptions(self, mock_destroy):
        mock_destroy.side_effect = Exception("boom")
        service.delete("dzigned/users/u1/photo", "image")  # must not raise


class DeleteByUrlTests(SimpleTestCase):
    @patch("files.service.cloudinary.uploader.destroy")
    def test_deletes_by_parsed_ref(self, mock_destroy):
        service.delete_by_url("https://res.cloudinary.com/demo/image/upload/v1/dzigned/users/u1/photo.jpg")
        mock_destroy.assert_called_once_with(
            "dzigned/users/u1/photo", resource_type="image", invalidate=True
        )

    @patch("files.service.cloudinary.uploader.destroy")
    def test_non_cloudinary_url_is_a_noop(self, mock_destroy):
        service.delete_by_url("https://example.com/photo.jpg")
        mock_destroy.assert_not_called()
