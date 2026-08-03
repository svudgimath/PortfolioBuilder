import uuid

from django.test import SimpleTestCase

from core.mongo import get_db
from portfolio.repository import SECTION_FIELDS, PortfolioRepository, serialize_document


class PortfolioRepositoryTests(SimpleTestCase):
    def setUp(self):
        self.repo = PortfolioRepository()
        self.user_id = str(uuid.uuid4())

    def tearDown(self):
        get_db()["portfolios"].delete_many({"userId": self.user_id})

    def test_find_by_user_id_returns_none_when_absent(self):
        self.assertIsNone(self.repo.find_by_user_id(self.user_id))

    def test_get_or_create_creates_empty_document_with_all_sections_null(self):
        doc = self.repo.get_or_create(self.user_id)
        self.assertEqual(doc["userId"], self.user_id)
        for field in SECTION_FIELDS:
            self.assertIsNone(doc[field])

    def test_get_or_create_is_idempotent(self):
        first = self.repo.get_or_create(self.user_id)
        second = self.repo.get_or_create(self.user_id)
        self.assertEqual(first["_id"], second["_id"])

    def test_update_full_sets_provided_sections(self):
        sections = {"meta": {"displayName": "A"}, "hero": {"greeting": "Hi"}}
        doc = self.repo.update_full(self.user_id, sections)
        self.assertEqual(doc["meta"], {"displayName": "A"})
        self.assertEqual(doc["hero"], {"greeting": "Hi"})
        self.assertIsNone(doc["about"])

    def test_update_full_nulls_out_omitted_sections(self):
        self.repo.update_full(self.user_id, {"meta": {"displayName": "A"}})
        doc = self.repo.update_full(self.user_id, {"hero": {"greeting": "Hi"}})
        self.assertIsNone(doc["meta"])
        self.assertEqual(doc["hero"], {"greeting": "Hi"})

    def test_update_section_only_touches_that_section(self):
        self.repo.update_section(self.user_id, "meta", {"displayName": "A"})
        doc = self.repo.update_section(self.user_id, "hero", {"greeting": "Hi"})
        self.assertEqual(doc["meta"], {"displayName": "A"})
        self.assertEqual(doc["hero"], {"greeting": "Hi"})

    def test_update_section_meta_syncs_hero_cta_pointing_at_old_resume(self):
        self.repo.update_section(self.user_id, "meta", {"resume": "https://old.example.com/resume.pdf"})
        self.repo.update_section(self.user_id, "hero", {
            "cta": {
                "primary": {"label": "Download Resume", "href": "https://old.example.com/resume.pdf"},
                "secondary": {"label": "Contact", "href": "#contact"},
            }
        })

        doc = self.repo.update_section(self.user_id, "meta", {"resume": "https://new.example.com/resume.pdf"})

        self.assertEqual(doc["hero"]["cta"]["primary"]["href"], "https://new.example.com/resume.pdf")
        self.assertEqual(doc["hero"]["cta"]["primary"]["label"], "Download Resume")
        # Untouched — its href never matched the old resume URL.
        self.assertEqual(doc["hero"]["cta"]["secondary"]["href"], "#contact")

    def test_update_section_meta_clears_hero_cta_when_resume_removed(self):
        self.repo.update_section(self.user_id, "meta", {"resume": "https://old.example.com/resume.pdf"})
        self.repo.update_section(self.user_id, "hero", {
            "cta": {"primary": {"label": "Download Resume", "href": "https://old.example.com/resume.pdf"}}
        })

        doc = self.repo.update_section(self.user_id, "meta", {"resume": None})

        self.assertIsNone(doc["hero"]["cta"]["primary"])

    def test_update_section_meta_leaves_unrelated_hero_cta_alone(self):
        self.repo.update_section(self.user_id, "meta", {"resume": "https://old.example.com/resume.pdf"})
        self.repo.update_section(self.user_id, "hero", {
            "cta": {"primary": {"label": "View Projects", "href": "#projects"}}
        })

        doc = self.repo.update_section(self.user_id, "meta", {"resume": "https://new.example.com/resume.pdf"})

        self.assertEqual(doc["hero"]["cta"]["primary"], {"label": "View Projects", "href": "#projects"})

    def test_update_section_unknown_section_raises(self):
        with self.assertRaises(ValueError):
            self.repo.update_section(self.user_id, "nope", {})

    def test_save_updates_updated_at(self):
        doc = self.repo.get_or_create(self.user_id)
        original_updated_at = doc["updatedAt"]
        doc = self.repo.update_section(self.user_id, "meta", {"displayName": "A"})
        self.assertGreaterEqual(doc["updatedAt"], original_updated_at)

    def test_serialize_document_shape(self):
        doc = self.repo.get_or_create(self.user_id)
        result = serialize_document(doc)
        self.assertIsInstance(result["id"], str)
        self.assertEqual(result["userId"], self.user_id)
        self.assertIsInstance(result["createdAt"], str)
        self.assertIsInstance(result["updatedAt"], str)
        for field in SECTION_FIELDS:
            self.assertIn(field, result)
