from django.conf import settings
from pymongo import MongoClient

_client = None


def get_db():
    global _client
    if _client is None:
        # tz_aware=True — without it, pymongo decodes BSON datetimes as naive
        # (implicitly UTC), which breaks comparisons against Django's aware
        # datetimes and silently drops the UTC offset from serialized timestamps.
        _client = MongoClient(settings.MONGODB_URI, tz_aware=True)
    return _client.get_default_database()
