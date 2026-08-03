from django.urls import path

from .views import GithubCallbackView, GithubConnectView, GithubStatusView

urlpatterns = [
    path("github/status", GithubStatusView.as_view(), name="github-status"),
    path("github/connect", GithubConnectView.as_view(), name="github-connect"),
    path("github/callback", GithubCallbackView.as_view(), name="github-callback"),
]
