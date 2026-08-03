from django.urls import path

from .views import FileDeleteView, FileUploadView

urlpatterns = [
    path("files/upload", FileUploadView.as_view(), name="file-upload"),
    path("files", FileDeleteView.as_view(), name="file-delete"),
]
