from django.test import SimpleTestCase

from files.cloudinary_ref import CloudinaryRef, parse


class ParseTests(SimpleTestCase):
    def test_none_returns_none(self):
        self.assertIsNone(parse(None))

    def test_blank_returns_none(self):
        self.assertIsNone(parse("   "))

    def test_non_cloudinary_url_returns_none(self):
        self.assertIsNone(parse("https://example.com/photo.jpg"))

    def test_missing_upload_marker_returns_none(self):
        self.assertIsNone(parse("https://res.cloudinary.com/demo/image/photo.jpg"))

    def test_invalid_resource_type_returns_none(self):
        self.assertIsNone(parse("https://res.cloudinary.com/demo/bogus/upload/v1/x.jpg"))

    def test_image_with_version_and_folder(self):
        ref = parse("https://res.cloudinary.com/demo/image/upload/v1234567890/dzigned/users/abc/photo_xyz.jpg")
        self.assertEqual(ref, CloudinaryRef(public_id="dzigned/users/abc/photo_xyz", resource_type="image"))

    def test_raw_without_version(self):
        ref = parse("https://res.cloudinary.com/demo/raw/upload/dzigned/users/abc/resume_xyz.pdf")
        self.assertEqual(ref, CloudinaryRef(public_id="dzigned/users/abc/resume_xyz", resource_type="raw"))

    def test_video_resource_type(self):
        ref = parse("https://res.cloudinary.com/demo/video/upload/v1/clip.mp4")
        self.assertEqual(ref, CloudinaryRef(public_id="clip", resource_type="video"))

    def test_dot_in_folder_name_not_mistaken_for_extension(self):
        ref = parse("https://res.cloudinary.com/demo/image/upload/folder.with.dots/name.jpg")
        self.assertEqual(ref.public_id, "folder.with.dots/name")

    def test_no_extension_keeps_full_tail(self):
        ref = parse("https://res.cloudinary.com/demo/image/upload/v1/dzigned/users/abc/photo_no_ext")
        self.assertEqual(ref.public_id, "dzigned/users/abc/photo_no_ext")

    def test_blank_tail_returns_none(self):
        self.assertIsNone(parse("https://res.cloudinary.com/demo/image/upload/"))

    def test_ref_is_hashable_and_supports_set_equality(self):
        a = parse("https://res.cloudinary.com/demo/image/upload/v1/x/y.jpg")
        b = parse("https://res.cloudinary.com/demo/image/upload/v2/x/y.jpg")  # different version, same public_id
        self.assertEqual({a}, {b})
