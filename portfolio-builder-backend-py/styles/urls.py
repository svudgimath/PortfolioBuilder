from django.urls import path

from .views import (
    StyleActivateView,
    StyleActiveView,
    StyleDetailView,
    StyleGenerateView,
    StyleListCreateView,
    StyleQuotaView,
)

# Literal routes MUST precede the <style_id> dynamic ones — Django matches path
# patterns in registration order, and "active"/"quota"/"generate" would otherwise
# be swallowed by the single-segment <str:style_id> pattern.
urlpatterns = [
    path("styles/active", StyleActiveView.as_view(), name="style-active"),
    path("styles/quota", StyleQuotaView.as_view(), name="style-quota"),
    path("styles/generate", StyleGenerateView.as_view(), name="style-generate"),
    path("styles/<str:style_id>/activate", StyleActivateView.as_view(), name="style-activate"),
    path("styles/<str:style_id>", StyleDetailView.as_view(), name="style-detail"),
    path("styles", StyleListCreateView.as_view(), name="style-list-create"),
]
