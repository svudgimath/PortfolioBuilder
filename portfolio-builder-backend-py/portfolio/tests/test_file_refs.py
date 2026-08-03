from django.test import SimpleTestCase

from files.cloudinary_ref import CloudinaryRef
from portfolio.file_refs import collect

CLOUD_URL = "https://res.cloudinary.com/demo/image/upload/v1/dzigned/users/u1/{}.jpg"


class CollectTests(SimpleTestCase):
    def test_none_doc_returns_empty_set(self):
        self.assertEqual(collect(None), set())

    def test_empty_doc_returns_empty_set(self):
        self.assertEqual(collect({}), set())

    def test_collects_meta_profile_photo_and_resume(self):
        doc = {"meta": {"profilePhoto": CLOUD_URL.format("photo"), "resume": CLOUD_URL.format("resume")}}
        refs = collect(doc)
        self.assertEqual(
            refs,
            {
                CloudinaryRef(public_id="dzigned/users/u1/photo", resource_type="image"),
                CloudinaryRef(public_id="dzigned/users/u1/resume", resource_type="image"),
            },
        )

    def test_collects_experience_company_logos(self):
        doc = {"experience": {"items": [{"companyLogo": CLOUD_URL.format("logo1")}, {"companyLogo": None}]}}
        refs = collect(doc)
        self.assertEqual(refs, {CloudinaryRef(public_id="dzigned/users/u1/logo1", resource_type="image")})

    def test_collects_education_logos(self):
        doc = {"education": {"items": [{"logo": CLOUD_URL.format("edulogo")}]}}
        refs = collect(doc)
        self.assertEqual(refs, {CloudinaryRef(public_id="dzigned/users/u1/edulogo", resource_type="image")})

    def test_collects_project_thumbnails(self):
        doc = {"projects": {"items": [{"thumbnail": CLOUD_URL.format("thumb")}]}}
        refs = collect(doc)
        self.assertEqual(refs, {CloudinaryRef(public_id="dzigned/users/u1/thumb", resource_type="image")})

    def test_collects_certification_thumbnails(self):
        doc = {"certifications": {"items": [{"thumbnail": CLOUD_URL.format("cert")}]}}
        refs = collect(doc)
        self.assertEqual(refs, {CloudinaryRef(public_id="dzigned/users/u1/cert", resource_type="image")})

    def test_collects_testimonial_avatars(self):
        doc = {"testimonials": {"items": [{"avatar": CLOUD_URL.format("avatar")}]}}
        refs = collect(doc)
        self.assertEqual(refs, {CloudinaryRef(public_id="dzigned/users/u1/avatar", resource_type="image")})

    def test_ignores_non_cloudinary_urls(self):
        doc = {"meta": {"profilePhoto": "https://example.com/external.jpg"}}
        self.assertEqual(collect(doc), set())

    def test_ignores_null_sections(self):
        doc = {"meta": None, "experience": None, "projects": {"items": None}}
        self.assertEqual(collect(doc), set())

    def test_deduplicates_identical_refs(self):
        doc = {
            "meta": {"profilePhoto": CLOUD_URL.format("same")},
            "projects": {"items": [{"thumbnail": CLOUD_URL.format("same")}]},
        }
        self.assertEqual(len(collect(doc)), 1)
