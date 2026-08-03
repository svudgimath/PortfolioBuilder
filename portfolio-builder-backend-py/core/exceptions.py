from rest_framework import status


class ApiException(Exception):
    """Base for exceptions that should map straight to a status + message,
    mirroring the Java backend's ApiException hierarchy."""

    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR

    def __init__(self, message):
        self.message = message
        super().__init__(message)


class BadRequestException(ApiException):
    status_code = status.HTTP_400_BAD_REQUEST


class UnauthorizedException(ApiException):
    status_code = status.HTTP_401_UNAUTHORIZED


class ConflictException(ApiException):
    status_code = status.HTTP_409_CONFLICT


class NotFoundException(ApiException):
    status_code = status.HTTP_404_NOT_FOUND


class BadGatewayException(ApiException):
    status_code = status.HTTP_502_BAD_GATEWAY


class TooManyRequestsException(ApiException):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS


class ServiceUnavailableException(ApiException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE


class GatewayTimeoutException(ApiException):
    status_code = status.HTTP_504_GATEWAY_TIMEOUT
