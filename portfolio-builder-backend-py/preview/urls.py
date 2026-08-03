from django.urls import path

from .views import PortfolioDataView, PreviewRedirectView, PreviewStaticView, StyleDataView

urlpatterns = [
    path("preview/<str:user_id>/data/portfolio.json", PortfolioDataView.as_view(), name="preview-portfolio-data"),
    path("preview/<str:user_id>/data/style.json", StyleDataView.as_view(), name="preview-style-data"),
    path("preview/<str:user_id>/<path:file_path>", PreviewStaticView.as_view(), name="preview-static"),
    path("preview/<str:user_id>/", PreviewStaticView.as_view(), name="preview-index"),
    path("preview/<str:user_id>", PreviewRedirectView.as_view(), name="preview-redirect"),
]
