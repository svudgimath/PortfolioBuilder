from django.urls import include, path

from core.views import HealthCheckView

urlpatterns = [
    path("health", HealthCheckView.as_view(), name="health"),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("portfolio.urls")),
    path("api/", include("styles.urls")),
    path("api/", include("files.urls")),
    path("api/", include("github_auth.urls")),
    path("api/", include("publish.urls")),
    path("api/", include("dashboard.urls")),
    path("api/", include("preview.urls")),
]
