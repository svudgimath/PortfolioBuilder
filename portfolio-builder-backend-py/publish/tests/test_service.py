import uuid
from unittest.mock import call, patch

from django.test import TestCase

from accounts.models import AppUser
from core.exceptions import BadRequestException, NotFoundException
from core.mongo import get_db
from github_auth.exceptions import GithubNotConnectedException
from github_auth.models import GithubAuth
from portfolio.repository import PortfolioRepository
from publish import service
from publish.models import PublishedPortfolio, Template


class PublishServiceTestsBase(TestCase):
    def setUp(self):
        self.user = AppUser.objects.create_user(
            email=f"pub-{uuid.uuid4()}@example.com", password="password123", name="Pub Tester"
        )
        self.user_id = str(self.user.id)
        Template.objects.filter(slug="default-test").delete()
        self.template = Template.objects.create(
            slug="default-test", name="Test Template", dist_path="templates/default/dist",
            data_path="data", portfolio_filename="portfolio.json", style_filename="style.json",
            is_active=True,
        )

    def tearDown(self):
        get_db()["portfolios"].delete_many({"userId": self.user_id})
        get_db()["styles"].delete_many({"userId": self.user_id})

    def _connect_github(self, login="octocat"):
        return GithubAuth.objects.create(
            user=self.user, github_user_id=1, github_login=login, access_token="tok-123"
        )


class PublishStatusTests(PublishServiceTestsBase):
    def test_never_published(self):
        result = service.get_publish_status(self.user_id)
        self.assertEqual(result, {"published": False, "repoExists": False})

    @patch("publish.service.github_api.repo_exists")
    def test_published_and_repo_exists(self, mock_repo_exists):
        self._connect_github()
        mock_repo_exists.return_value = True
        PublishedPortfolio.objects.create(
            user=self.user, repo_name="my-repo", repo_url="https://github.com/octocat/my-repo",
            pages_url="https://octocat.github.io/my-repo",
        )
        result = service.get_publish_status(self.user_id)
        self.assertTrue(result["published"])
        self.assertTrue(result["repoExists"])
        self.assertEqual(result["repoName"], "my-repo")

    @patch("publish.service.github_api.repo_exists")
    def test_published_but_repo_deleted(self, mock_repo_exists):
        self._connect_github()
        mock_repo_exists.return_value = False
        PublishedPortfolio.objects.create(
            user=self.user, repo_name="my-repo", repo_url="https://github.com/octocat/my-repo",
        )
        result = service.get_publish_status(self.user_id)
        self.assertTrue(result["published"])
        self.assertFalse(result["repoExists"])

    def test_published_but_github_disconnected_reports_repo_not_exists(self):
        PublishedPortfolio.objects.create(
            user=self.user, repo_name="my-repo", repo_url="https://github.com/octocat/my-repo",
        )
        result = service.get_publish_status(self.user_id)
        self.assertTrue(result["published"])
        self.assertFalse(result["repoExists"])


class SuggestRepoNameTests(PublishServiceTestsBase):
    def test_requires_github_connected(self):
        with self.assertRaises(GithubNotConnectedException):
            service.suggest_repo_name(self.user_id)

    @patch("publish.service.github_api.repo_exists")
    def test_base_name_when_available(self, mock_repo_exists):
        self._connect_github(login="octocat")
        mock_repo_exists.return_value = False
        result = service.suggest_repo_name(self.user_id)
        self.assertEqual(result["suggestedName"], "dzigned-portfolio-octocat")

    @patch("publish.service.github_api.repo_exists")
    def test_falls_back_to_numbered_suffix(self, mock_repo_exists):
        self._connect_github(login="octocat")
        # base and -2 taken, -3 free
        mock_repo_exists.side_effect = lambda token, owner, name: name in (
            "dzigned-portfolio-octocat", "dzigned-portfolio-octocat-2",
        )
        result = service.suggest_repo_name(self.user_id)
        self.assertEqual(result["suggestedName"], "dzigned-portfolio-octocat-3")

    @patch("publish.service.github_api.repo_exists")
    def test_all_ten_taken_falls_back_to_base_name(self, mock_repo_exists):
        self._connect_github(login="octocat")
        mock_repo_exists.return_value = True
        result = service.suggest_repo_name(self.user_id)
        self.assertEqual(result["suggestedName"], "dzigned-portfolio-octocat")
        self.assertEqual(mock_repo_exists.call_count, 10)  # base + -2..-10


class ValidateRepoNameTests(PublishServiceTestsBase):
    def test_requires_github_connected(self):
        with self.assertRaises(GithubNotConnectedException):
            service.validate_repo_name(self.user_id, "some-repo")

    @patch("publish.service.github_api.repo_exists")
    def test_owned_by_us(self, mock_repo_exists):
        self._connect_github()
        PublishedPortfolio.objects.create(
            user=self.user, repo_name="my-repo", repo_url="https://github.com/octocat/my-repo",
        )
        result = service.validate_repo_name(self.user_id, "my-repo")
        self.assertEqual(result, {
            "available": False, "ownedByUs": True,
            "message": "This is your currently published repo. You can re-publish to it.",
        })
        mock_repo_exists.assert_not_called()

    @patch("publish.service.github_api.repo_exists")
    def test_taken_by_someone_else(self, mock_repo_exists):
        self._connect_github()
        mock_repo_exists.return_value = True
        result = service.validate_repo_name(self.user_id, "taken-repo")
        self.assertFalse(result["available"])
        self.assertFalse(result["ownedByUs"])
        self.assertIn("already exists", result["message"])

    @patch("publish.service.github_api.repo_exists")
    def test_available(self, mock_repo_exists):
        self._connect_github()
        mock_repo_exists.return_value = False
        result = service.validate_repo_name(self.user_id, "fresh-repo")
        self.assertEqual(result, {"available": True, "ownedByUs": False, "message": "Repository name is available."})


class PublishWorkflowTests(PublishServiceTestsBase):
    def _save_portfolio_with_meta(self):
        PortfolioRepository().update_section(self.user_id, "meta", {"displayName": "Jane"})

    def test_requires_github_connected(self):
        with self.assertRaises(GithubNotConnectedException):
            service.publish(self.user_id, "repo", "FULL")

    @patch("publish.service.github_api.repo_exists")
    def test_empty_portfolio_raises_bad_request(self, mock_repo_exists):
        self._connect_github()
        with self.assertRaises(BadRequestException):
            service.publish(self.user_id, "repo", "FULL")

    @patch("publish.service.github_api.enable_pages")
    @patch("publish.service.github_api.upsert_file")
    @patch("publish.service.github_api.create_repo")
    @patch("publish.service.github_api.repo_exists")
    def test_new_repo_forces_full_publish_and_enables_pages(
        self, mock_repo_exists, mock_create_repo, mock_upsert, mock_enable_pages
    ):
        self._connect_github()
        self._save_portfolio_with_meta()
        mock_repo_exists.return_value = False

        published = service.publish(self.user_id, "new-repo", "CONTENT_ONLY")

        mock_create_repo.assert_called_once_with("tok-123", "new-repo")
        mock_enable_pages.assert_called_once()
        # dist push (several template files) + at least the portfolio.json data push
        self.assertGreater(mock_upsert.call_count, 1)
        self.assertEqual(published.repo_name, "new-repo")
        self.assertEqual(published.repo_url, "https://github.com/octocat/new-repo")
        self.assertEqual(published.pages_url, "https://octocat.github.io/new-repo/")
        self.assertTrue(published.pages_enabled)

    @patch("publish.service.github_api.enable_pages")
    @patch("publish.service.github_api.upsert_file")
    @patch("publish.service.github_api.repo_exists")
    def test_existing_repo_content_only_skips_dist_and_pages(
        self, mock_repo_exists, mock_upsert, mock_enable_pages
    ):
        self._connect_github()
        self._save_portfolio_with_meta()
        mock_repo_exists.return_value = True

        service.publish(self.user_id, "existing-repo", "CONTENT_ONLY")

        mock_enable_pages.assert_not_called()
        # Only portfolio.json pushed (no active style, no dist files)
        self.assertEqual(mock_upsert.call_count, 1)
        pushed_path = mock_upsert.call_args[0][3]
        self.assertEqual(pushed_path, "data/portfolio.json")

    @patch("publish.service.github_api.enable_pages")
    @patch("publish.service.github_api.upsert_file")
    @patch("publish.service.github_api.repo_exists")
    def test_existing_repo_full_mode_pushes_dist_and_enables_pages(
        self, mock_repo_exists, mock_upsert, mock_enable_pages
    ):
        self._connect_github()
        self._save_portfolio_with_meta()
        mock_repo_exists.return_value = True

        service.publish(self.user_id, "existing-repo", "FULL")

        mock_enable_pages.assert_called_once()
        self.assertGreater(mock_upsert.call_count, 1)

    @patch("publish.service.github_api.upsert_file")
    @patch("publish.service.github_api.repo_exists")
    def test_data_files_under_template_are_skipped_in_dist_push(self, mock_repo_exists, mock_upsert):
        self._connect_github()
        self._save_portfolio_with_meta()
        mock_repo_exists.return_value = False

        with patch("publish.service.github_api.create_repo"), patch("publish.service.github_api.enable_pages"):
            service.publish(self.user_id, "new-repo", "FULL")

        pushed_paths = [c.args[3] for c in mock_upsert.call_args_list]
        self.assertTrue(all(not p.startswith("data/") or p == "data/portfolio.json" for p in pushed_paths))
        # confirm none of the template's OWN sample data/ files leaked through
        self.assertNotIn("data/style-neon.json", pushed_paths)
        self.assertNotIn("data/styles1.json", pushed_paths)

    @patch("publish.service.github_api.upsert_file")
    @patch("publish.service.github_api.repo_exists")
    def test_saves_published_portfolio_row(self, mock_repo_exists, mock_upsert):
        self._connect_github()
        self._save_portfolio_with_meta()
        mock_repo_exists.return_value = True

        service.publish(self.user_id, "existing-repo", "CONTENT_ONLY")

        row = PublishedPortfolio.objects.get(user=self.user)
        self.assertEqual(row.repo_name, "existing-repo")
        self.assertIsNotNone(row.last_published_at)

    @patch("publish.service.github_api.upsert_file")
    @patch("publish.service.github_api.repo_exists")
    def test_republishing_updates_existing_row_not_creates_new(self, mock_repo_exists, mock_upsert):
        self._connect_github()
        self._save_portfolio_with_meta()
        mock_repo_exists.return_value = True

        service.publish(self.user_id, "existing-repo", "CONTENT_ONLY")
        service.publish(self.user_id, "existing-repo", "CONTENT_ONLY")

        self.assertEqual(PublishedPortfolio.objects.filter(user=self.user).count(), 1)

    @patch("publish.service.github_api.enable_pages")
    def test_enable_pages_failure_does_not_fail_publish(self, mock_enable_pages):
        mock_enable_pages.side_effect = Exception("pages already enabled")
        self._connect_github()
        self._save_portfolio_with_meta()

        with patch("publish.service.github_api.repo_exists", return_value=False), \
             patch("publish.service.github_api.create_repo"), \
             patch("publish.service.github_api.upsert_file"):
            published = service.publish(self.user_id, "new-repo", "FULL")

        self.assertTrue(published.pages_enabled)  # recorded true regardless, matching Java
