from django.test import SimpleTestCase

from portfolio.serializers.document import PortfolioDocumentSerializer
from portfolio.serializers.sections import (
    ContactSerializer,
    EducationItemSerializer,
    ExperienceItemSerializer,
    MetaSerializer,
    ProjectItemSerializer,
)


class MetaSerializerTests(SimpleTestCase):
    def test_display_name_required(self):
        serializer = MetaSerializer(data={})
        self.assertFalse(serializer.is_valid())
        self.assertIn("Display name is required", str(serializer.errors["displayName"]))

    def test_valid_meta_passes(self):
        serializer = MetaSerializer(data={"displayName": "Jane Doe", "openToWork": True})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["displayName"], "Jane Doe")
        self.assertEqual(serializer.validated_data["openToWork"], True)

    def test_display_name_max_length(self):
        serializer = MetaSerializer(data={"displayName": "x" * 201})
        self.assertFalse(serializer.is_valid())
        self.assertIn("Display name must be at most 200 characters", str(serializer.errors["displayName"]))

    def test_other_fields_are_optional(self):
        serializer = MetaSerializer(data={"displayName": "Jane"})
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_uses_resume_field_name_not_resume_url(self):
        """Matches the Java source field name (`resume`), not the stale
        dzigned-api-contract.md doc which says `resumeUrl`."""
        serializer = MetaSerializer(data={"displayName": "Jane", "resume": "https://cdn/resume.pdf"})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["resume"], "https://cdn/resume.pdf")


class ContactSerializerTests(SimpleTestCase):
    def test_invalid_email_format(self):
        serializer = ContactSerializer(data={"email": "not-an-email"})
        self.assertFalse(serializer.is_valid())
        self.assertIn("Invalid email format", str(serializer.errors["email"]))

    def test_blank_email_is_valid(self):
        serializer = ContactSerializer(data={"email": ""})
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_all_fields_optional(self):
        serializer = ContactSerializer(data={})
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_socials_nested_validation(self):
        serializer = ContactSerializer(data={"socials": [{"platform": "x" * 101, "url": "https://x.com"}]})
        self.assertFalse(serializer.is_valid())
        self.assertIn("socials", serializer.errors)

    def test_valid_socials_pass(self):
        serializer = ContactSerializer(data={"socials": [{"platform": "GitHub", "url": "https://github.com/x"}]})
        self.assertTrue(serializer.is_valid(), serializer.errors)


class FlexibleDescriptionFieldTests(SimpleTestCase):
    def test_experience_description_accepts_bare_string(self):
        serializer = ExperienceItemSerializer(data={"description": "Built the thing"})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["description"], ["Built the thing"])

    def test_experience_description_accepts_array(self):
        serializer = ExperienceItemSerializer(data={"description": ["Built the thing", "Shipped it"]})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["description"], ["Built the thing", "Shipped it"])

    def test_education_description_accepts_bare_string(self):
        serializer = EducationItemSerializer(
            data={"institution": "MIT", "degree": "BS", "description": "Studied things"}
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["description"], ["Studied things"])

    def test_experience_item_has_no_required_fields(self):
        serializer = ExperienceItemSerializer(data={})
        self.assertTrue(serializer.is_valid(), serializer.errors)


class EducationItemSerializerTests(SimpleTestCase):
    def test_institution_and_degree_required(self):
        serializer = EducationItemSerializer(data={})
        self.assertFalse(serializer.is_valid())
        self.assertIn("Institution is required", str(serializer.errors["institution"]))
        self.assertIn("Degree is required", str(serializer.errors["degree"]))

    def test_valid_education_item(self):
        serializer = EducationItemSerializer(data={"institution": "MIT", "degree": "BS"})
        self.assertTrue(serializer.is_valid(), serializer.errors)


class ProjectItemSerializerTests(SimpleTestCase):
    def test_project_name_and_description_required(self):
        serializer = ProjectItemSerializer(data={})
        self.assertFalse(serializer.is_valid())
        self.assertIn("Project name is required", str(serializer.errors["projectName"]))
        self.assertIn("Project description is required", str(serializer.errors["description"]))

    def test_description_is_a_plain_string_not_a_list(self):
        """Unlike Experience/Education, ProjectItem.description is a single string."""
        serializer = ProjectItemSerializer(data={"projectName": "X", "description": "A cool project"})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["description"], "A cool project")


class PortfolioDocumentSerializerTests(SimpleTestCase):
    def test_empty_document_is_valid(self):
        serializer = PortfolioDocumentSerializer(data={})
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_invalid_nested_section_surfaces_under_its_key(self):
        serializer = PortfolioDocumentSerializer(data={"meta": {}})
        self.assertFalse(serializer.is_valid())
        self.assertIn("meta", serializer.errors)

    def test_full_document_round_trips(self):
        data = {
            "meta": {"displayName": "Jane"},
            "contact": {"email": "jane@example.com"},
        }
        serializer = PortfolioDocumentSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["meta"]["displayName"], "Jane")
        self.assertEqual(serializer.validated_data["contact"]["email"], "jane@example.com")
