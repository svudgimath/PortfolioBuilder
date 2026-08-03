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
    # Explicit name rather than get_default_database() — some managed Mongo
    # providers (e.g. Railway's MongoDB template) hand out a connection
    # string with no database segment in the path, which makes pymongo's
    # URI-default lookup raise ConfigurationError.
    return _client["dzigned"]
