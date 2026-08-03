from django.test import SimpleTestCase

from core.exceptions import BadRequestException
from files.file_type_detector import ALLOWED_TYPES, detect, verify

JPEG_BYTES = bytes([0xFF, 0xD8, 0xFF, 0xE0]) + b"restofjpeg"
PNG_BYTES = bytes([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) + b"restofpng"
GIF87_BYTES = b"GIF87a" + b"restofgif"
GIF89_BYTES = b"GIF89a" + b"restofgif"
WEBP_BYTES = b"RIFF" + b"\x00\x00\x00\x00" + b"WEBP" + b"restofwebp"
PDF_BYTES = b"%PDF-1.4" + b"restofpdf"


class DetectTests(SimpleTestCase):
    def test_detects_jpeg(self):
        self.assertEqual(detect(JPEG_BYTES), "image/jpeg")

    def test_detects_png(self):
        self.assertEqual(detect(PNG_BYTES), "image/png")

    def test_detects_gif87a(self):
        self.assertEqual(detect(GIF87_BYTES), "image/gif")

    def test_detects_gif89a(self):
        self.assertEqual(detect(GIF89_BYTES), "image/gif")

    def test_detects_webp(self):
        self.assertEqual(detect(WEBP_BYTES), "image/webp")

    def test_detects_pdf(self):
        self.assertEqual(detect(PDF_BYTES), "application/pdf")

    def test_unknown_bytes_return_none(self):
        self.assertIsNone(detect(b"just some random text"))

    def test_empty_bytes_return_none(self):
        self.assertIsNone(detect(b""))

    def test_none_returns_none(self):
        self.assertIsNone(detect(None))

    def test_too_short_for_webp_signature_returns_none(self):
        self.assertIsNone(detect(b"RIFF"))

    def test_riff_without_webp_marker_is_not_webp(self):
        self.assertIsNone(detect(b"RIFF\x00\x00\x00\x00AVI "))


class VerifyTests(SimpleTestCase):
    def test_matching_declared_type_passes(self):
        self.assertEqual(verify("image/jpeg", JPEG_BYTES), "image/jpeg")

    def test_jpg_alias_normalizes_to_jpeg(self):
        self.assertEqual(verify("image/jpg", JPEG_BYTES), "image/jpeg")

    def test_pjpeg_alias_normalizes_to_jpeg(self):
        self.assertEqual(verify("image/pjpeg", JPEG_BYTES), "image/jpeg")

    def test_case_insensitive_declared_type(self):
        self.assertEqual(verify("IMAGE/JPEG", JPEG_BYTES), "image/jpeg")

    def test_no_declared_type_still_verifies_via_magic_bytes(self):
        self.assertEqual(verify(None, PNG_BYTES), "image/png")

    def test_corrupted_bytes_raise_bad_request(self):
        with self.assertRaises(BadRequestException) as ctx:
            verify("image/jpeg", b"not a real image")
        self.assertIn("Unsupported or corrupted file", ctx.exception.message)

    def test_mismatched_declared_type_raises_bad_request(self):
        with self.assertRaises(BadRequestException) as ctx:
            verify("application/pdf", JPEG_BYTES)
        self.assertIn("does not match its declared type", ctx.exception.message)


class AllowedTypesTests(SimpleTestCase):
    def test_allowed_types_match_contract(self):
        self.assertEqual(
            ALLOWED_TYPES,
            {"image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"},
        )
