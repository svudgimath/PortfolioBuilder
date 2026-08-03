from django.db import connection
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthCheckView(APIView):
    """Public liveness/readiness probe for load balancers and PaaS platforms.
    Checks Postgres connectivity (the one dependency every request needs) —
    deliberately skips Mongo/Cloudinary/Gemini so a slow external provider
    doesn't flap this endpoint between healthy/unhealthy."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
        except Exception as e:
            return Response({"status": "down", "detail": str(e)}, status=503)
        return Response({"status": "up"})
