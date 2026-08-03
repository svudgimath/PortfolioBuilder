from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from core.exceptions import BadRequestException

from . import file_type_detector, service

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


class FileUploadView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        upload = request.FILES.get("file")
        if upload is None:
            raise BadRequestException("file is required")

        # Also enforced by Cloudinary/network limits, but checked here for a
        # friendlier error message before we touch anything.
        if upload.size > MAX_FILE_SIZE:
            raise BadRequestException("File size exceeds 5MB limit")

        # Declared type whitelist. The actual bytes are re-verified against magic
        # bytes inside service.store() before anything is shipped to Cloudinary.
        content_type = upload.content_type
        if not content_type or content_type.lower() not in file_type_detector.ALLOWED_TYPES:
            raise BadRequestException("File type not allowed. Use JPG, PNG, GIF, WebP, or PDF.")

        result = service.store(upload.read(), upload.name, content_type, str(request.user.id))
        return Response(result)


class FileDeleteView(APIView):
    def delete(self, request):
        public_id = request.query_params.get("publicId")
        if not public_id:
            raise BadRequestException("publicId is required")
        resource_type = request.query_params.get("resourceType")
        service.delete(public_id, resource_type)
        return Response(status=204)
