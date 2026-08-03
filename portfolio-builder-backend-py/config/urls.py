from django.urls import include, path

urlpatterns = [
    path("api/auth/", include("accounts.urls")),
    path("api/", include("portfolio.urls")),
    path("api/", include("styles.urls")),
    path("api/", include("files.urls")),
    path("api/", include("github_auth.urls")),
    path("api/", include("publish.urls")),
    path("api/", include("dashboard.urls")),
    path("api/", include("preview.urls")),
]
