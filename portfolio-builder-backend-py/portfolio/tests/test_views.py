import uuid

from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import AppUser
from core import jwt_service
from core.mongo import get_db


class PortfolioViewTestsBase(APITestCase):
    def setUp(self):
        self.user = AppUser.objects.create_user(
            email=f"portfolio-{uuid.uuid4()}@example.com",
            password="password123",
            name="Portfolio Tester",
        )
        token = jwt_service.generate_access_token(str(self.user.id), self.user.email)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def tearDown(self):
        get_db()["portfolios"].delete_many({"userId": str(self.user.id)})


class PortfolioGetTests(PortfolioViewTestsBase):
    url = "/api/portfolio"

    def test_requires_authentication(self):
        self.client.credentials()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_auto_creates_empty_portfolio(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["userId"], str(self.user.id))
        self.assertIsNone(response.data["meta"])
        self.assertIn("id", response.data)
        self.assertIn("createdAt", response.data)
        self.assertIn("updatedAt", response.data)

    def test_get_is_idempotent_does_not_create_duplicates(self):
        first = self.client.get(self.url)
        second = self.client.get(self.url)
        self.assertEqual(first.data["id"], second.data["id"])


class PortfolioPutFullTests(PortfolioViewTestsBase):
    url = "/api/portfolio"

    def test_full_update_success(self):
        response = self.client.put(
            self.url,
            {"meta": {"displayName": "Jane Doe"}, "contact": {"email": "jane@example.com"}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["meta"]["displayName"], "Jane Doe")
        self.assertEqual(response.data["contact"]["email"], "jane@example.com")

    def test_full_update_nulls_out_omitted_sections(self):
        """Matches Java's updateFull — PUT is a full replace, not a merge."""
        self.client.put(self.url, {"meta": {"displayName": "Jane Doe"}}, format="json")
        response = self.client.put(self.url, {"hero": {"greeting": "Hi"}}, format="json")
        self.assertIsNone(response.data["meta"])
        self.assertEqual(response.data["hero"]["greeting"], "Hi")

    def test_full_update_validation_error_returns_400(self):
        response = self.client.put(self.url, {"meta": {}}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("meta", response.data["message"])

    def test_full_update_persists_between_requests(self):
        self.client.put(self.url, {"meta": {"displayName": "Jane Doe"}}, format="json")
        get_response = self.client.get(self.url)
        self.assertEqual(get_response.data["meta"]["displayName"], "Jane Doe")

    def test_requires_authentication(self):
        self.client.credentials()
        response = self.client.put(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class PortfolioSectionUpdateTests(PortfolioViewTestsBase):
    def test_update_meta_section(self):
        response = self.client.put("/api/portfolio/meta", {"displayName": "Jane"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["meta"]["displayName"], "Jane")

    def test_update_meta_missing_display_name_returns_400(self):
        response = self.client.put("/api/portfolio/meta", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Display name is required", response.data["message"])

    def test_updating_one_section_does_not_touch_others(self):
        self.client.put("/api/portfolio/meta", {"displayName": "Jane"}, format="json")
        response = self.client.put("/api/portfolio/hero", {"greeting": "Hi"}, format="json")
        self.assertEqual(response.data["meta"]["displayName"], "Jane")
        self.assertEqual(response.data["hero"]["greeting"], "Hi")

    def test_update_contact_section(self):
        response = self.client.put(
            "/api/portfolio/contact", {"email": "a@example.com", "phone": "123"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["contact"]["email"], "a@example.com")

    def test_update_experience_section_with_nested_items_and_flexible_description(self):
        payload = {"items": [{"company": "Acme", "role": "Engineer", "description": "Built things"}]}
        response = self.client.put("/api/portfolio/experience", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["experience"]["items"][0]["company"], "Acme")
        self.assertEqual(response.data["experience"]["items"][0]["description"], ["Built things"])

    def test_update_education_missing_required_fields_returns_400(self):
        payload = {"items": [{"fieldOfStudy": "CS"}]}
        response = self.client.put("/api/portfolio/education", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_projects_section(self):
        payload = {"items": [{"projectName": "Cool App", "description": "It's cool"}]}
        response = self.client.put("/api/portfolio/projects", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["projects"]["items"][0]["projectName"], "Cool App")

    def test_unknown_section_url_returns_404(self):
        response = self.client.put("/api/portfolio/not-a-real-section", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_section_update_requires_authentication(self):
        self.client.credentials()
        response = self.client.put("/api/portfolio/meta", {"displayName": "Jane"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_all_non_meta_sections_accept_an_empty_body(self):
        sections = [
            "hero",
            "about",
            "skills",
            "experience",
            "education",
            "projects",
            "certifications",
            "research",
            "testimonials",
            "contact",
            "footer",
        ]
        for section in sections:
            response = self.client.put(f"/api/portfolio/{section}", {}, format="json")
            self.assertEqual(response.status_code, status.HTTP_200_OK, f"{section} failed: {response.data}")
