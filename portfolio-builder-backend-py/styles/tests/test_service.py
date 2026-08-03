import uuid

from django.test import SimpleTestCase

from core.exceptions import NotFoundException, UnauthorizedException
from core.mongo import get_db
from portfolio.repository import PortfolioRepository
from styles import service


class StyleServiceTestsBase(SimpleTestCase):
    def setUp(self):
        self.user_id = str(uuid.uuid4())
        PortfolioRepository().get_or_create(self.user_id)

    def tearDown(self):
        get_db()["portfolios"].delete_many({"userId": self.user_id})
        get_db()["styles"].delete_many({"userId": self.user_id})


class SaveStyleVersioningTests(StyleServiceTestsBase):
    def test_first_save_gets_version_1_and_auto_activates(self):
        saved = service.save_style(self.user_id, {"theme": {"mode": "dark"}})
        self.assertEqual(saved["version"], 1)
        self.assertTrue(saved["isActive"])

    def test_second_save_gets_version_2_and_defaults_inactive(self):
        service.save_style(self.user_id, {"theme": {"mode": "dark"}})
        second = service.save_style(self.user_id, {"theme": {"mode": "light"}})
        self.assertEqual(second["version"], 2)
        self.assertFalse(second["isActive"])

    def test_explicit_is_active_true_deactivates_previous(self):
        first = service.save_style(self.user_id, {"theme": {"mode": "dark"}})
        second = service.save_style(self.user_id, {"theme": {"mode": "light"}, "isActive": True})
        self.assertTrue(second["isActive"])

        refreshed_first = service._style_repository.find_by_id(str(first["_id"]))
        self.assertFalse(refreshed_first["isActive"])

    def test_server_sets_portfolio_and_user_id(self):
        saved = service.save_style(self.user_id, {})
        self.assertEqual(saved["userId"], self.user_id)
        self.assertIn("portfolioId", saved)

    def test_incoming_id_is_ignored_forces_insert(self):
        saved = service.save_style(self.user_id, {"_id": "bogus"})
        self.assertNotEqual(saved["_id"], "bogus")


class SaveStylePruningTests(StyleServiceTestsBase):
    def test_prunes_oldest_inactive_beyond_five(self):
        # n=0 (version 1) auto-activates as the first save, so it's protected from
        # pruning even though it's the oldest — matches Java's actual skip-based
        # pruning (only inactive styles are candidates), not a naive "delete oldest".
        for i in range(6):
            service.save_style(self.user_id, {"n": i})

        remaining = service.get_all_styles(self.user_id)
        self.assertEqual(len(remaining), 5)
        remaining_versions = sorted(s["version"] for s in remaining)
        self.assertEqual(remaining_versions, [1, 3, 4, 5, 6])

    def test_active_style_is_never_pruned(self):
        for i in range(4):
            service.save_style(self.user_id, {"n": i})
        # explicitly activate the oldest one, then push past the cap
        all_styles = service.get_all_styles(self.user_id)
        oldest = min(all_styles, key=lambda s: s["version"])
        service.activate_style(self.user_id, str(oldest["_id"]))

        for i in range(4, 8):
            service.save_style(self.user_id, {"n": i})

        remaining_ids = {str(s["_id"]) for s in service.get_all_styles(self.user_id)}
        self.assertIn(str(oldest["_id"]), remaining_ids)
        self.assertEqual(len(remaining_ids), 5)


class ActivateStyleTests(StyleServiceTestsBase):
    def test_activating_deactivates_others(self):
        first = service.save_style(self.user_id, {})
        second = service.save_style(self.user_id, {})

        service.activate_style(self.user_id, str(first["_id"]))

        refreshed_first = service._style_repository.find_by_id(str(first["_id"]))
        refreshed_second = service._style_repository.find_by_id(str(second["_id"]))
        self.assertTrue(refreshed_first["isActive"])
        self.assertFalse(refreshed_second["isActive"])

    def test_activating_missing_style_raises_not_found(self):
        with self.assertRaises(NotFoundException):
            service.activate_style(self.user_id, "000000000000000000000000")

    def test_activating_someone_elses_style_raises_unauthorized(self):
        style = service.save_style(self.user_id, {})
        other_user = str(uuid.uuid4())
        with self.assertRaises(UnauthorizedException):
            service.activate_style(other_user, str(style["_id"]))


class DeleteStyleTests(StyleServiceTestsBase):
    def test_delete_removes_style(self):
        style = service.save_style(self.user_id, {})
        service.delete_style(self.user_id, str(style["_id"]))
        self.assertIsNone(service._style_repository.find_by_id(str(style["_id"])))

    def test_delete_missing_style_raises_not_found(self):
        with self.assertRaises(NotFoundException):
            service.delete_style(self.user_id, "000000000000000000000000")

    def test_delete_someone_elses_style_raises_unauthorized(self):
        style = service.save_style(self.user_id, {})
        other_user = str(uuid.uuid4())
        with self.assertRaises(UnauthorizedException):
            service.delete_style(other_user, str(style["_id"]))


class SerializeStyleTests(SimpleTestCase):
    def test_omits_none_fields(self):
        from bson import ObjectId

        doc = {"_id": ObjectId(), "userId": "u1", "portfolioId": "p1", "templateId": None, "theme": None}
        result = service.serialize_style(doc)
        self.assertNotIn("templateId", result)
        self.assertNotIn("theme", result)
        self.assertEqual(result["userId"], "u1")
