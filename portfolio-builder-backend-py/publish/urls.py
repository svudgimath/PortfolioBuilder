from django.urls import path

from .views import PublishStatusView, PublishView, RepoSuggestView, TemplateListView, ValidateRepoView

# Literal routes precede "publish" (the bare POST endpoint) for clarity, though there's
# no <id>-style dynamic segment here to create ambiguity like in the styles app.
urlpatterns = [
    path("publish/status", PublishStatusView.as_view(), name="publish-status"),
    path("publish/repo-suggest", RepoSuggestView.as_view(), name="publish-repo-suggest"),
    path("publish/validate-repo", ValidateRepoView.as_view(), name="publish-validate-repo"),
    path("publish/templates", TemplateListView.as_view(), name="publish-templates"),
    path("publish", PublishView.as_view(), name="publish"),
]
