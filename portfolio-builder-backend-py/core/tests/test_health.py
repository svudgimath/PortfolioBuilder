from unittest.mock import patch

from rest_framework.test import APITestCase


class HealthCheckMiddlewareTests(APITestCase):
    url = "/health"

    def test_healthy_returns_200(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "up"})

    def test_does_not_require_authentication(self):
        response = self.client.get(self.url)  # no credentials set
        self.assertNotEqual(response.status_code, 401)

    def test_bypasses_allowed_hosts_validation(self):
        response = self.client.get(self.url, HTTP_HOST="some-unlisted-host.example")
        self.assertEqual(response.status_code, 200)

    @patch("core.middleware.connection")
    def test_db_failure_returns_503(self, mock_connection):
        mock_connection.cursor.side_effect = Exception("connection refused")
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["status"], "down")
