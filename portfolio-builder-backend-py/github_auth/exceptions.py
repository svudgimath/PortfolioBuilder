from core.exceptions import BadRequestException


class GithubNotConnectedException(BadRequestException):
    def __init__(self):
        super().__init__("GitHub not connected. Please connect your GitHub account first.")
