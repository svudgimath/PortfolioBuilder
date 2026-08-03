import uuid

from django.db.utils import IntegrityError
from django.test import TestCase, TransactionTestCase

from accounts.models import AppUser


class AppUserModelTests(TestCase):
    def test_password_is_hashed_not_plaintext(self):
        user = AppUser(email="hash-test@example.com", name="A")
        user.set_password("password123")
        user.save()
        self.assertNotEqual(user.password, "password123")
        self.assertTrue(user.check_password("password123"))
        self.assertFalse(user.check_password("wrong-password"))

    def test_uses_app_user_table(self):
        self.assertEqual(AppUser._meta.db_table, "app_user")

    def test_password_column_is_password_hash(self):
        field = AppUser._meta.get_field("password")
        self.assertEqual(field.db_column, "password_hash")

    def test_id_is_uuid(self):
        user = AppUser.objects.create_user(email="uuid-test@example.com", password="password123")
        self.assertIsInstance(user.id, uuid.UUID)

    def test_created_and_updated_at_are_set_on_save(self):
        user = AppUser.objects.create_user(email="timestamps@example.com", password="password123")
        self.assertIsNotNone(user.created_at)
        self.assertIsNotNone(user.updated_at)


class AppUserUniqueEmailTests(TransactionTestCase):
    """Uses TransactionTestCase because IntegrityError aborts the wrapping
    transaction, which plain TestCase can't roll back from mid-test."""

    def test_email_unique_constraint(self):
        AppUser.objects.create_user(email="dupe@example.com", password="password123", name="First")
        with self.assertRaises(IntegrityError):
            AppUser.objects.create_user(email="dupe@example.com", password="password123", name="Second")
