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
