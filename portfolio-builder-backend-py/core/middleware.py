from django.db import connection
from django.http import HttpResponse, JsonResponse


class HealthCheckMiddleware:
    """Answers GET /health before any other middleware runs, so platform
    healthcheck probes (which often send a Host header that doesn't match
    ALLOWED_HOSTS) never get rejected by CommonMiddleware's host validation."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path == "/health":
            try:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
            except Exception as e:
                return JsonResponse({"status": "down", "detail": str(e)}, status=503)
            return JsonResponse({"status": "up"})
        return self.get_response(request)
