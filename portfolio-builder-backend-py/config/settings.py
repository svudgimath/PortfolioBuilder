from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env()
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("DJANGO_SECRET_KEY", default="django-insecure-dev-key-change-in-production")
DEBUG = env.bool("DJANGO_DEBUG", default=True)
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["*"])

# ── Production safety: fail fast rather than boot with insecure dev defaults ──
if not DEBUG:
    _insecure_defaults = {
        "DJANGO_SECRET_KEY": SECRET_KEY == "django-insecure-dev-key-change-in-production",
        "JWT_SECRET": env("JWT_SECRET", default="default-dev-secret-change-in-production")
        == "default-dev-secret-change-in-production",
    }
    _still_default = [name for name, is_default in _insecure_defaults.items() if is_default]
    if _still_default:
        raise RuntimeError(
            "DJANGO_DEBUG=False but these env vars are still using their insecure dev "
            f"defaults: {', '.join(_still_default)}. Set real values before deploying."
        )
    if ALLOWED_HOSTS == ["*"]:
        raise RuntimeError("DJANGO_DEBUG=False requires DJANGO_ALLOWED_HOSTS to be set explicitly.")

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "rest_framework",
    "corsheaders",
    "core",
    "accounts",
    "portfolio",
    "styles",
    "files",
    "github_auth",
    "publish",
    "dashboard",
    "preview",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "HOST": env("DB_HOST", default="localhost"),
        "PORT": env("DB_PORT", default="5633"),
        "NAME": env("DB_NAME", default="portfolio_builder"),
        "USER": env("DB_USER", default="portfolio_user"),
        "PASSWORD": env("DB_PASSWORD", default="portfolio_pass"),
    }
}

AUTH_USER_MODEL = "accounts.AppUser"

# ── MongoDB (portfolio documents, styles) ───────────────────────────────────
MONGODB_URI = env(
    "MONGODB_URI",
    default="mongodb://portfolio_user:portfolio_pass@localhost:27018/dzigned?authSource=admin",
)

# ── LLM style generation (Gemini) ───────────────────────────────────────────
GEMINI_API_KEY = env("GEMINI_API_KEY", default="")
LLM_DEFAULT_MODEL = env("LLM_DEFAULT_MODEL", default="gemini-2.5-flash")
LLM_TIMEOUT_SECONDS = env.int("LLM_TIMEOUT_SECONDS", default=60)
LLM_RATE_PER_MINUTE = env.int("LLM_RATE_PER_MINUTE", default=5)
LLM_RATE_PER_DAY = env.int("LLM_RATE_PER_DAY", default=5)

# ── Cloudinary (file storage) ────────────────────────────────────────────────
CLOUDINARY_CLOUD_NAME = env("CLOUDINARY_CLOUD_NAME", default="")
CLOUDINARY_API_KEY = env("CLOUDINARY_API_KEY", default="")
CLOUDINARY_API_SECRET = env("CLOUDINARY_API_SECRET", default="")

# ── GitHub OAuth ─────────────────────────────────────────────────────────────
GITHUB_CLIENT_ID = env("GITHUB_CLIENT_ID", default="")
GITHUB_CLIENT_SECRET = env("GITHUB_CLIENT_SECRET", default="")
GITHUB_REDIRECT_URI = env("GITHUB_REDIRECT_URI", default="http://localhost:8080/api/github/callback")
GITHUB_SCOPE = env("GITHUB_SCOPE", default="public_repo")
GITHUB_FRONTEND_SUCCESS_URL = env("GITHUB_FRONTEND_SUCCESS_URL", default="http://localhost:5173")

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.BCryptSHA256PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ── JWT ──────────────────────────────────────────────────────────────────────
JWT_SECRET = env("JWT_SECRET", default="default-dev-secret-change-in-production")
JWT_ACCESS_EXPIRATION_SECONDS = env.int("JWT_ACCESS_EXPIRATION_SECONDS", default=3600)
JWT_REFRESH_EXPIRATION_SECONDS = env.int("JWT_REFRESH_EXPIRATION_SECONDS", default=604800)

# ── CORS ─────────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = env.list("CORS_ORIGINS", default=["http://localhost:5173"])
CORS_ALLOW_CREDENTIALS = True

# ── Django REST Framework ───────────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "core.authentication.BearerJWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "EXCEPTION_HANDLER": "core.exception_handler.api_exception_handler",
    "UNAUTHENTICATED_USER": None,
    "DEFAULT_THROTTLE_RATES": {
        "auth": "10/min",
    },
}

# ── Production hardening (HTTPS, reverse-proxy headers) ─────────────────────
# Most PaaS platforms (Railway, Render, Fly.io, etc.) terminate TLS at a proxy and
# forward plain HTTP internally, tagging the original scheme in this header.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

if not DEBUG:
    SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=31536000)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
