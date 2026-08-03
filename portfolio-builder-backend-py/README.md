# Dzigned Portfolio Builder — Backend (Python/Django)

A Django REST Framework backend for Dzigned — a SaaS that lets users build portfolio
websites via forms and publish them directly to GitHub Pages.

## Tech Stack

- **Python 3.12**, **Django 5.2**, **Django REST Framework**
- **PostgreSQL** (Docker, host port 5633 → 5432) — users, auth, GitHub links, published-repo
  records, templates, LLM generation log
- **MongoDB** (Docker, port 27018, db: `dzigned`) — portfolio documents, styles
- **Cloudinary** — file storage (images + PDFs)
- **Google Gemini** (`google-genai` SDK) — LLM style generation + resume parsing
- **PyJWT** — stateless auth, hand-rolled to match the frontend's expected claim shape
  (`sub`, `email`, `type`, HS256) rather than a JWT library's own conventions
- **httpx** — GitHub OAuth + REST API calls

## App Structure

Each app covers one domain module:

| App | Covers |
|---|---|
| `core/` | Shared: JWT service, DRF authentication class, exception hierarchy + handler, Mongo client |
| `accounts/` | Signup, login, refresh — `AppUser` (Postgres) |
| `portfolio/` | Portfolio CRUD (12 sections) + resume import (`portfolio/llm/`) — Mongo `portfolios` collection |
| `styles/` | Style CRUD + LLM style generation (`styles/llm/`) — Mongo `styles` collection, `GenerationLog` (Postgres) rate limiting |
| `files/` | Cloudinary upload/delete, magic-byte file-type verification |
| `github_auth/` | GitHub OAuth connect flow — `GithubAuth` (Postgres) |
| `publish/` | Publish to GitHub Pages — `Template` + `PublishedPortfolio` (Postgres), bundled template files under `publish/template_files/` |
| `dashboard/` | Read-only aggregator (user + portfolio completion + publish status) |
| `preview/` | Public (no-auth) live-preview endpoints — portfolio/style JSON + the template SPA shell |

## Local Development Setup

### Prerequisites
- Docker (for PostgreSQL + MongoDB)
- Python 3.12
- A virtualenv (this repo's is at `venv/`, gitignored)

### Setup

```bash
# 1. Start databases (Postgres on host port 5633, Mongo on 27018)
docker-compose up -d

# 2. Create and activate a virtualenv, then install dependencies
python -m venv venv
./venv/Scripts/python.exe -m pip install -r requirements.txt   # Windows
# source venv/bin/activate && pip install -r requirements.txt  # macOS/Linux

# 3. Copy env config and fill in real secrets (see below)
cp .env.example .env

# 4. Apply migrations (creates the Postgres schema)
./venv/Scripts/python.exe manage.py migrate

# 5. Seed the template catalog (upserts Template rows from publish/seeds.py)
./venv/Scripts/python.exe manage.py seed_templates

# 6. Run the server — port 8080 to match the frontend's default VITE_API_BASE_URL
./venv/Scripts/python.exe manage.py runserver 8080
```

### Config — `.env`

Copied from `.env.example`, gitignored. Defaults already target the local Docker stack, so
the app runs with zero config beyond `docker-compose up -d`. To enable real external
integrations, fill in:

- `GEMINI_API_KEY` — Style generation and resume import fail gracefully (500) without it
- `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` — file uploads
  fail gracefully (502) without it
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — from a GitHub OAuth App
  (github.com/settings/developers), callback URL `http://localhost:8080/api/github/callback`
  — GitHub connect redirects to a 404 without it

### Tests

```bash
./venv/Scripts/python.exe manage.py test
```

Runs against the same Postgres/Mongo containers (Django auto-creates/drops a
`test_portfolio_builder` Postgres database per run; Mongo tests write to the real `dzigned`
db under per-test-unique keys and clean up in `tearDown`).

## Known Gaps

None currently — every module is implemented (Auth, Portfolio incl. resume import, Styles,
Files, GitHub OAuth, Publish, Dashboard, Preview).

Two things that are *config-dependent*, not missing: live LLM generation/resume-parsing and
live Cloudinary uploads both need real credentials in `.env` (see above) — without them, the
relevant endpoints respond with a clean error rather than crashing.

## Production Deployment

The app ships with a production `Dockerfile` (gunicorn, non-root user, port from `$PORT`) and
fail-fast settings that refuse to start with `DJANGO_DEBUG=False` unless every secret has been
changed from its dev default. This section walks through a from-scratch deploy on any
Docker-capable host (a VM, Fly.io, Render, Railway, ECS, etc.) — it's deliberately not tied to
one platform.

### 1. Provision the databases

You need a reachable **PostgreSQL** instance and a reachable **MongoDB** instance. Use your
platform's managed offering (RDS/Cloud SQL/Neon for Postgres, Atlas for Mongo) or run them
yourself — this repo's `docker-compose.yml` is dev-only and not meant for production traffic.

Note the connection details for both; you'll need them in step 2.

### 2. Set environment variables

Set these in your platform's environment/secrets config — never commit them, and never reuse
the values from `.env.example`:

| Variable | Notes |
|---|---|
| `DJANGO_SECRET_KEY` | Generate a fresh one: `python -c "import secrets; print(secrets.token_urlsafe(50))"` |
| `DJANGO_DEBUG` | `False` |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated real domain(s), e.g. `api.yourdomain.com` — the app refuses to start with the dev default (`*`) when `DEBUG=False` |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | From step 1's Postgres instance |
| `MONGODB_URI` | From step 1's Mongo instance, full connection string including credentials |
| `JWT_SECRET` | A second, independently generated secret (same command as above) — must differ from `DJANGO_SECRET_KEY` |
| `JWT_ACCESS_EXPIRATION_SECONDS` / `JWT_REFRESH_EXPIRATION_SECONDS` | Defaults (`3600` / `604800`) are usually fine |
| `CORS_ORIGINS` | Your deployed frontend's real origin, e.g. `https://yourdomain.com` |
| `GEMINI_API_KEY` | From [Google AI Studio](https://aistudio.google.com/apikey) — required for style generation + resume import |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | From your Cloudinary dashboard — required for file uploads. Newer accounts also block direct delivery of PDF/ZIP files by default (a 401 on the resume download link) — enable **Settings → Security → "Allow delivery of PDF and ZIP files"** in the Cloudinary console |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | From a GitHub OAuth App (github.com/settings/developers) |
| `GITHUB_REDIRECT_URI` | `https://<your-api-domain>/api/github/callback` — must exactly match the OAuth App's callback URL |
| `GITHUB_FRONTEND_SUCCESS_URL` | Your deployed frontend's real origin |
| `SECURE_SSL_REDIRECT` | Defaults to `True` when `DEBUG=False`. Set to `False` only if your platform already terminates TLS and redirects for you upstream |

If `DJANGO_DEBUG=False` and `DJANGO_SECRET_KEY` or `JWT_SECRET` are still the dev-default
values, the app raises a `RuntimeError` on startup instead of silently running insecurely —
treat that error as a signal you missed a variable, not a bug.

### 3. Build and push the image

```bash
docker build -t <registry>/<image-name>:<tag> .
docker push <registry>/<image-name>:<tag>
```

### 4. Run migrations and seed data (release step)

Run once per deploy, before traffic is routed to the new version — most platforms have a
dedicated "release command" hook for this; otherwise run it manually against the same env vars
as the running container:

```bash
docker run --rm --env-file .env.production <registry>/<image-name>:<tag> \
  python manage.py migrate

docker run --rm --env-file .env.production <registry>/<image-name>:<tag> \
  python manage.py seed_templates
```

### 5. Deploy the container

Run the image with the environment variables from step 2. The container listens on `$PORT`
(defaults to `8080` if unset) via gunicorn with 3 workers:

```bash
docker run -d -p 8080:8080 --env-file .env.production <registry>/<image-name>:<tag>
```

On a PaaS (Fly.io, Render, Railway, etc.), point it at the pushed image and set the same
environment variables through the platform's UI/CLI instead of `--env-file`.

### 6. Point the frontend at it

Set the frontend's `VITE_API_BASE_URL` to `https://<your-api-domain>/api` and redeploy the
frontend.

### 7. Verify

```bash
curl https://<your-api-domain>/health
# {"status": "up"}
```

`/health` is public (no auth) and checks Postgres connectivity only — it deliberately skips
Mongo/Cloudinary/Gemini so a slow third-party provider doesn't flap the check. If it returns
`{"status": "down", "detail": "..."}` with a 503, the detail message points at the Postgres
connection problem.

Then do one real end-to-end pass through the deployed frontend: sign up, create a portfolio,
and publish it, to confirm Mongo, Cloudinary, and GitHub OAuth are all reachable too.
