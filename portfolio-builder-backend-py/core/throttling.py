from rest_framework.throttling import SimpleRateThrottle


class AuthRateThrottle(SimpleRateThrottle):
    """10 requests/minute per client IP on /api/auth/** — mirrors RateLimitFilter.java
    (Bucket4j, 10/min per IP). Applied explicitly on the accounts views, not globally."""

    scope = "auth"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}
