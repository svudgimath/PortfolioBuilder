import uuid
from unittest.mock import patch

from rest_framework.test import APITestCase

from accounts.models import AppUser
from core import jwt_service
from core.mongo import get_db

OLD_PHOTO = "https://res.cloudinary.com/demo/image/upload/v1/dzigned/users/u1/old_photo.jpg"
NEW_PHOTO = "https://res.cloudinary.com/demo/image/upload/v1/dzigned/users/u1/new_photo.jpg"


class OrphanCleanupTests(APITestCase):
    def setUp(self):
        self.user = AppUser.objects.create_user(
            email=f"orphan-{uuid.uuid4()}@example.com", password="password123", name="Orphan Tester"
        )
        token = jwt_service.generate_access_token(str(self.user.id), self.user.email)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def tearDown(self):
        get_db()["portfolios"].delete_many({"userId": str(self.user.id)})

    @patch("portfolio.repository.file_service.delete")
    def test_replacing_profile_photo_deletes_the_old_one(self, mock_delete):
        self.client.put("/api/portfolio/meta", {"displayName": "Jane", "profilePhoto": OLD_PHOTO}, format="json")
        mock_delete.assert_not_called()  # nothing to orphan on first save

        self.client.put("/api/portfolio/meta", {"displayName": "Jane", "profilePhoto": NEW_PHOTO}, format="json")

        mock_delete.assert_called_once_with("dzigned/users/u1/old_photo", "image")

    @patch("portfolio.repository.file_service.delete")
    def test_clearing_profile_photo_deletes_it(self, mock_delete):
        self.client.put("/api/portfolio/meta", {"displayName": "Jane", "profilePhoto": OLD_PHOTO}, format="json")
        self.client.put("/api/portfolio/meta", {"displayName": "Jane"}, format="json")

        mock_delete.assert_called_once_with("dzigned/users/u1/old_photo", "image")

    @patch("portfolio.repository.file_service.delete")
    def test_unchanged_photo_is_not_deleted(self, mock_delete):
        self.client.put("/api/portfolio/meta", {"displayName": "Jane", "profilePhoto": OLD_PHOTO}, format="json")
        self.client.put("/api/portfolio/meta", {"displayName": "Jane Updated", "profilePhoto": OLD_PHOTO}, format="json")

        mock_delete.assert_not_called()

    @patch("portfolio.repository.file_service.delete")
    def test_full_replace_orphans_removed_section_photos(self, mock_delete):
        self.client.put("/api/portfolio", {"meta": {"displayName": "Jane", "profilePhoto": OLD_PHOTO}}, format="json")
        self.client.put("/api/portfolio", {"hero": {"greeting": "Hi"}}, format="json")

        mock_delete.assert_called_once_with("dzigned/users/u1/old_photo", "image")

    @patch("portfolio.repository.file_service.delete")
    def test_orphan_delete_failure_does_not_break_the_save(self, mock_delete):
        mock_delete.side_effect = Exception("cloudinary down")
        self.client.put("/api/portfolio/meta", {"displayName": "Jane", "profilePhoto": OLD_PHOTO}, format="json")

        response = self.client.put("/api/portfolio/meta", {"displayName": "Jane", "profilePhoto": NEW_PHOTO}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["meta"]["profilePhoto"], NEW_PHOTO)
