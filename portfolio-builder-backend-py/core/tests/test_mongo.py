import uuid
from datetime import datetime, timezone

from django.test import SimpleTestCase

from core.mongo import get_db


class MongoTimezoneAwarenessTests(SimpleTestCase):
    """Regression test: pymongo decodes BSON datetimes as naive by default,
    which breaks comparisons against Django's timezone-aware datetimes and
    silently drops the UTC offset when serialized via .isoformat(). The Mongo
    client must be configured with tz_aware=True to avoid this."""

    def setUp(self):
        self.collection = get_db()["_tz_test_probe"]
        self.doc_id = str(uuid.uuid4())

    def tearDown(self):
        self.collection.delete_one({"_id": self.doc_id})

    def test_datetimes_read_back_from_mongo_are_timezone_aware(self):
        self.collection.insert_one({"_id": self.doc_id, "at": datetime.now(timezone.utc)})
        doc = self.collection.find_one({"_id": self.doc_id})
        self.assertIsNotNone(doc["at"].tzinfo)

    def test_isoformat_includes_utc_offset(self):
        self.collection.insert_one({"_id": self.doc_id, "at": datetime.now(timezone.utc)})
        doc = self.collection.find_one({"_id": self.doc_id})
        self.assertRegex(doc["at"].isoformat(), r"\+00:00$")
