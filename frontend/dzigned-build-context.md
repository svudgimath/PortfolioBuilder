# Dzigned — API Contract

**Base URL:** `http://localhost:8080/api`

**Auth:** Protected endpoints require `Authorization: Bearer <JWT>` header.

---

## Auth

### POST `/auth/signup`
**Public**
```json
// Request
{ "name": "Alex Carter", "email": "alex@test.com", "password": "password123" }

// Response 200
{ "token": "eyJhbGc...", "name": "Alex Carter", "email": "alex@test.com" }
```

### POST `/auth/login`
**Public**
```json
// Request
{ "email": "alex@test.com", "password": "password123" }

// Response 200
{ "token": "eyJhbGc...", "name": "Alex Carter", "email": "alex@test.com" }
```

---

## User

### GET `/user/me`
**Protected** — returns authenticated user profile
```json
// Response 200
{
  "id": "uuid",
  "name": "Alex Carter",
  "email": "alex@test.com"
}
```
*(Note: not yet implemented — needs to be added)*

---

## Dashboard

### GET `/dashboard`
**Protected** — combined data for dashboard page
```json
// Response 200
{
  "user": {
    "name": "Alex Carter",
    "email": "alex@test.com"
  },
  "portfolio": {
    "updatedAt": "2026-04-19T...",
    "completedSections": ["meta", "hero", "about", "skills", "experience", "contact"],
    "totalSections": 12
  },
  "publish": {
    "published": true,
    "repoExists": true,
    "pagesUrl": "https://alex.github.io/dzigned-portfolio-alex",
    "lastPublishedAt": "2026-04-17T...",
    "hasUnpublishedChanges": true
  }
}
```

---

## Portfolio

### GET `/portfolio`
**Protected** — returns the user's full portfolio (auto-creates empty one if none exists)
```json
// Response 200
{
  "id": "mongoId",
  "userId": "uuid",
  "createdAt": "2026-04-02T01:27:08Z",
  "updatedAt": "2026-04-02T01:27:08Z",
  "meta": { ... } | null,
  "hero": { ... } | null,
  "about": { ... } | null,
  "skills": { ... } | null,
  "experience": { ... } | null,
  "education": { ... } | null,
  "projects": { ... } | null,
  "certifications": { ... } | null,
  "research": { ... } | null,
  "testimonials": { ... } | null,
  "contact": { ... } | null,
  "footer": { ... } | null
}
```

### POST `/portfolio/parse-resume`
**Protected** — uploads a PDF resume and returns prefill data for all portfolio sections.
- Request: `multipart/form-data`, field name `file`, PDF only, max 5 MB
- The response is **not saved automatically** — the frontend should prefill form fields and let the user review/edit before calling `PUT /portfolio` or `PUT /portfolio/{section}`
- File fields (`profilePhoto`, `companyLogo`, `thumbnail`, etc.) are never populated — the user must upload those separately
- All item IDs (`experience.items[].id`, `education.items[].id`, etc.) are pre-filled with UUIDs so the frontend can use them directly
- Scanned / image-only PDFs return `400` — only text-based PDFs are supported

```
// Request: multipart/form-data
field "file": <PDF binary>

// Response 200 — partial portfolio data; any section absent from the resume is null
{
  "meta": {
    "displayName": "Alex Carter",
    "title": "Senior Software Engineer",
    "shortIntro": "Full-stack engineer with 6 years building distributed systems...",
    "location": "San Francisco, CA",
    "website": "https://alexcarter.dev"
  },
  "hero": {
    "socials": [
      { "platform": "linkedin", "url": "https://linkedin.com/in/alexcarter" },
      { "platform": "github", "url": "https://github.com/alexcarter" }
    ]
  },
  "about": {
    "description": ["Full-stack engineer with a passion for building..."],
    "whatIDo": [
      { "heading": "Backend Systems", "brief": "Design and build scalable APIs..." }
    ],
    "interests": ["open source", "hiking", "mechanical keyboards"]
  },
  "skills": {
    "categorized": true,
    "items": [
      { "category": "Languages", "tags": ["Java", "TypeScript", "Python"] },
      { "category": "Frameworks", "tags": ["Spring Boot", "React", "FastAPI"] }
    ]
  },
  "experience": {
    "items": [
      {
        "id": "uuid",
        "company": "Acme Corp",
        "role": "Senior Software Engineer",
        "startDate": "Jan 2022",
        "endDate": null,
        "current": true,
        "location": "San Francisco, CA",
        "description": ["Led migration of monolith to microservices...", "Reduced p99 latency by 40%..."],
        "tags": ["Java", "Kubernetes", "PostgreSQL"]
      }
    ]
  },
  "education": {
    "items": [
      {
        "id": "uuid",
        "institution": "MIT",
        "degree": "Bachelor of Science",
        "fieldOfStudy": "Computer Science",
        "startDate": "2014",
        "endDate": "2018",
        "location": "Cambridge, MA",
        "grade": "3.9 GPA",
        "description": []
      }
    ]
  },
  "projects": { "items": [ ... ] } | null,
  "certifications": { "items": [ ... ] } | null,
  "research": { "items": [ ... ] } | null,
  "contact": {
    "email": "alex@example.com",
    "phone": "+1 555 000 1234",
    "socials": [
      { "platform": "linkedin", "url": "https://linkedin.com/in/alexcarter" }
    ]
  }
}

// Error 400 — not a PDF, or image-only/scanned PDF
{ "status": 400, "message": "Only PDF files are accepted for resume parsing." }

// Error 502 — Gemini unavailable
{ "status": 502, "message": "Resume parsing failed. Please try again later." }
```

### PUT `/portfolio`
**Protected** — replaces entire portfolio
Request body: same shape as GET response (minus id/userId/timestamps)
Response: updated PortfolioDocument

### PUT `/portfolio/{section}`
**Protected** — updates a single section
Sections: `meta`, `hero`, `about`, `skills`, `experience`, `education`, `projects`, `certifications`, `research`, `testimonials`, `contact`, `footer`
Request body: just that section's object
Response: full updated PortfolioDocument

---

## Section Shapes (with validation rules)

**R = required, O = optional**
**"required if section exists" means: if user chooses to add this section, these fields must be filled**

### meta (REQUIRED section)
```json
{
  "displayName": "R — user's full name",
  "title": "R — professional title e.g. 'Full Stack Engineer'",
  "shortIntro": "R — 1-2 sentence bio for hero section",
  "location": "O",
  "profilePhoto": "O — fileId from upload",
  "openToWork": "O — boolean, defaults to false",
  "resume": "O — fileId from upload (PDF)",
  "website": "O — personal website URL"
}
```

### hero (REQUIRED section)
```json
{
  "greeting": "O — defaults to 'Hi, I'm'",
  "showProfilePhoto": "O — boolean, defaults to true",
  "cta": {
    "primary": { "label": "O", "href": "O — section anchor like #projects" },
    "secondary": { "label": "O", "href": "O" }
  },
  "socials[]": { "platform": "R if item exists", "url": "R if item exists" }
}
```
Note: Hero socials are populated from contact.socials on the frontend. User selects up to 3 from a dropdown/checkbox of their contact socials. The full { platform, url } objects are saved to hero.socials.

### about (OPTIONAL section)
```json
{
  "sectionLabel": "O — defaults to 'About Me'",
  "sectionTitle": "O — defaults to 'A little about who I am'",
  "description": "R if section exists — at least one paragraph",
  "description[]": "string — each paragraph non-empty",
  "whatIDo": "O — array",
  "whatIDo[]": { "heading": "R if item exists", "brief": "R if item exists" },
  "highlights": "O — array",
  "highlights[]": { "name": "R if item exists", "quant": "R if item exists" },
  "interests": "O — array of non-empty strings"
}
```

### skills (OPTIONAL section)
```json
{
  "sectionLabel": "O — defaults to 'Skills'",
  "sectionTitle": "O — defaults to 'What I bring to the table'",
  "categorized": "R — boolean. true = grouped by category, false = flat list",
  "items": "R if section exists — at least one item",
  "items[]": {
    "category": "R if categorized=true, ignored if categorized=false",
    "tags": "R — at least one tag"
  }
}
```
If categorized=false, frontend sends a single item with no category and all skills as tags.

### experience (OPTIONAL section)
```json
{
  "sectionLabel": "O — defaults to 'Work Experience'",
  "sectionTitle": "O — defaults to 'My professional journey so far'",
  "items": "R if section exists — at least one item",
  "items[]": {
    "id": "auto-generated — frontend generates UUID when adding",
    "company": "R",
    "role": "R",
    "startDate": "O",
    "endDate": "O",
    "current": "O — boolean, defaults to false. If true, endDate is ignored",
    "location": "O",
    "description": "O — list of bullet points, list of paragraphs, or a single paragraph",
    "tags": "O",
    "companyLogo": "O — fileId",
    "companyUrl": "O"
  }
}
```

### education (OPTIONAL section)
```json
{
  "sectionLabel": "O — defaults to 'Education'",
  "sectionTitle": "O — defaults to 'My academic background'",
  "items": "R if section exists — at least one item",
  "items[]": {
    "id": "auto-generated",
    "institution": "R",
    "degree": "R",
    "fieldOfStudy": "O",
    "startDate": "O",
    "endDate": "O",
    "location": "O",
    "grade": "O",
    "description": "O — list of bullet points",
    "tags": "O",
    "logo": "O — fileId"
  }
}
```

### projects (OPTIONAL section)
```json
{
  "sectionLabel": "O — defaults to 'Projects'",
  "sectionTitle": "O — defaults to 'Things I have built'",
  "items": "R if section exists — at least one item",
  "items[]": {
    "id": "auto-generated",
    "projectName": "R",
    "description": "R",
    "tags": "O",
    "liveUrl": "O — deployed URL",
    "repoUrl": "O — source code link",
    "thumbnail": "O — fileId",
    "startDate": "O",
    "endDate": "O",
    "featured": "O — boolean, defaults to false"
  }
}
```

### certifications (OPTIONAL section)
```json
{
  "sectionLabel": "O — defaults to 'Certifications & Achievements'",
  "sectionTitle": "O — defaults to 'Credentials and recognition'",
  "items": "R if section exists — at least one item",
  "items[]": {
    "id": "auto-generated",
    "name": "R",
    "issuer": "R",
    "description": "O",
    "dateIssued": "O",
    "expiryDate": "O",
    "credentialUrl": "O",
    "thumbnail": "O — fileId",
    "tags": "O"
  }
}
```

### research (OPTIONAL section)
```json
{
  "sectionLabel": "O — defaults to 'Research & Publications'",
  "sectionTitle": "O — defaults to 'My contributions to the field'",
  "items": "R if section exists — at least one item",
  "items[]": {
    "id": "auto-generated",
    "title": "R",
    "authors": "O — list of author names",
    "publishedIn": "O",
    "date": "O",
    "description": "O",
    "tags": "O",
    "url": "O — link to paper",
    "doi": "O"
  }
}
```

### testimonials (OPTIONAL section)
```json
{
  "sectionLabel": "O — defaults to 'Testimonials'",
  "sectionTitle": "O — defaults to 'What people say about me'",
  "items": "R if section exists — at least one item",
  "items[]": {
    "id": "auto-generated",
    "name": "R",
    "message": "R",
    "role": "O",
    "company": "O",
    "avatar": "O — fileId",
    "linkedinUrl": "O"
  }
}
```

### contact (REQUIRED section)
At least one of email, phone, or socials must exist.
```json
{
  "sectionLabel": "O — defaults to 'Get In Touch'",
  "heading": "O — defaults to 'Let's build something great together.'",
  "tagline": "O",
  "email": "O — but at least one of email/phone/socials must exist",
  "phone": "O — but at least one of email/phone/socials must exist",
  "socials": "O — but at least one of email/phone/socials must exist",
  "socials[]": { "platform": "R if item exists", "url": "R if item exists" }
}
```

### footer (REQUIRED section)
Template always shows "Built with Dzigned" — customNote is additional.
```json
{
  "customNote": "O — personal quote or tagline shown alongside 'Built with Dzigned'"
}
```

---

## File Uploads

### POST `/files/upload`
**Protected** — multipart/form-data upload
```
Request: multipart form with "file" field
Constraints: max 5MB, allowed types: image/jpeg, image/png, image/gif, image/webp, application/pdf
```
```json
// Response 200
{
  "fileId": "682a3f1b9c2d...",
  "filename": "profile.jpg",
  "contentType": "image/jpeg",
  "url": "/api/files/682a3f1b9c2d..."
}
```

### GET `/files/{fileId}`
**Public** — serves the file (no auth needed, for preview)
Response: the file binary with correct Content-Type header

### DELETE `/files/{fileId}`
**Protected** — deletes the file
Response: 204 No Content

### Which portfolio fields use file uploads:
| Section | Field | Type |
|---------|-------|------|
| meta | profilePhoto | image |
| meta | resume | pdf |
| experience.items[] | companyLogo | image |
| education.items[] | logo | image |
| projects.items[] | thumbnail | image |
| certifications.items[] | thumbnail | image |
| testimonials.items[] | avatar | image |

### How file references work:
- During editing: fields store fileId (e.g. "682a3f1b9c2d..."), frontend displays via http://localhost:8080/api/files/{fileId}
- On publish: backend pulls files from GridFS, pushes to GitHub as assets/images/{fileId}.ext, rewrites JSON paths to /assets/images/{fileId}.ext

---

## Styles

### GET `/styles`
**Protected** — all styles for the user, newest first
```json
// Response 200
[
  {
    "id": "styleId",
    "portfolioId": "...",
    "userId": "uuid",
    "templateId": "portfolio-template-2",
    "version": 3,
    "isActive": true,
    "generatedAt": "2026-04-02T...",
    "prompt": "dark minimal with purple accents",
    "theme": {
      "bg": "#0f0f13",
      "text": "#e8e8f0",
      "accent1": "#a78bfa",
      "accent2": "#818cf8",
      "textDim": "#94a3b8",
      "textMuted": "#64748b",
      "card": "#1a1a24",
      "border": "#2a2a3a",
      "fontHeading": "Inter",
      "fontBody": "Inter"
    },
    "background": { "style": "mesh" },
    "components": {
      "card": { "style": "border", "quantColor": null },
      "button": { "style": "filled", "quantColor": null },
      "sectionLabel": { "style": "pill", "quantColor": null },
      "achievementTag": { "style": "glow", "quantColor": "gradient" },
      "socialIcon": { "style": "icon", "quantColor": null }
    },
    "sections": {
      "experience": { "variant": "timeline", "entryStyle": "border" },
      "education": { "variant": "compact", "entryStyle": "none" },
      "projects": { "variant": "grid", "entryStyle": "shadow" },
      "certifications": { "variant": "list", "entryStyle": "shadow" },
      "research": { "variant": "list", "entryStyle": "none" },
      "testimonials": { "variant": "grid", "entryStyle": "border" },
      "contact": { "variant": "centered", "entryStyle": null }
    }
  }
]
```

### GET `/styles/active`
**Protected** — currently active style
Response: StyleDocument or 204 No Content if none

### POST `/styles`
**Protected** — save a new style (auto-versions, handles active toggle)
Request body: full StyleDocument (minus id/version/generatedAt)
Response: saved StyleDocument

### PATCH `/styles/{styleId}/activate`
**Protected** — switch which style is active
Response: the activated StyleDocument

### DELETE `/styles/{styleId}`
**Protected**
Response: 204 No Content

---

## GitHub

### GET `/github/status`
**Protected**
```json
// Response 200 — not connected
{ "connected": false }

// Response 200 — connected
{ "connected": true, "githubLogin": "alexcarter" }
```

### GET `/github/connect?token={jwt}`
**Public** — redirects to GitHub OAuth. Frontend navigates to this URL (full page redirect, NOT an XHR call). Token is passed as query param because the browser follows the redirect chain.

### GET `/github/callback?code=...&state=...`
**Public** — GitHub calls this after user authorizes. Redirects to `frontend-success-url?github=connected` or `?github=error`.

---

## Publish

### GET `/publish/status`
**Protected** — returns publish state for the user
```json
// Never published
{
  "published": false,
  "repoExists": false,
  "repoName": null,
  "repoUrl": null,
  "pagesUrl": null,
  "lastPublishedAt": null
}

// Published & repo still exists
{
  "published": true,
  "repoExists": true,
  "repoName": "dzigned-portfolio-alex",
  "repoUrl": "https://github.com/alex/dzigned-portfolio-alex",
  "pagesUrl": "https://alex.github.io/dzigned-portfolio-alex",
  "lastPublishedAt": "2026-04-02T01:47:07Z"
}

// Published but repo was deleted
{
  "published": true,
  "repoExists": false,
  "repoName": "dzigned-portfolio-alex",
  "repoUrl": "https://github.com/alex/dzigned-portfolio-alex",
  "pagesUrl": "https://alex.github.io/dzigned-portfolio-alex",
  "lastPublishedAt": "2026-04-02T01:47:07Z"
}
```

### GET `/publish/repo-suggest`
**Protected** — suggests an available repo name
```json
// Response 200
{ "suggestedName": "dzigned-portfolio-alex" }
```

### POST `/publish/validate-repo`
**Protected** — checks if a repo name is usable
```json
// Request
{ "repoName": "my-portfolio" }

// Response 200 — available
{ "available": true, "ownedByUs": false, "message": "Repository name is available." }

// Response 200 — taken by another repo
{ "available": false, "ownedByUs": false, "message": "Repository 'my-portfolio' already exists on your GitHub. Please choose a different name." }

// Response 200 — this is the user's currently published repo
{ "available": false, "ownedByUs": true, "message": "This is your currently published repo. You can re-publish to it." }
```

### POST `/publish`
**Protected** — publishes (or re-publishes) the portfolio
```json
// Request
{ "repoName": "dzigned-portfolio-alex", "mode": "FULL" }
// mode = "FULL" (push template + data + media) or "CONTENT_ONLY" (push only JSON data)

// Response 200
{
  "repoName": "dzigned-portfolio-alex",
  "repoUrl": "https://github.com/alex/dzigned-portfolio-alex",
  "pagesUrl": "https://alex.github.io/dzigned-portfolio-alex",
  "lastPublishedAt": "2026-04-02T01:47:07Z"
}
```

### GET `/publish/templates`
**Protected** — lists available templates
```json
// Response 200
[
  {
    "id": "uuid",
    "slug": "portfolio-template-2",
    "name": "Developer Portfolio",
    "description": "Clean portfolio template for software engineers",
    "isActive": true
  }
]
```

---

## Error Responses

All error responses follow this shape:

```json
{
  "timestamp": "2026-04-02T01:47:07Z",
  "status": 500,
  "error": "Internal Server Error",
  "message": "Portfolio is empty. Please add some content before publishing.",
  "path": "/api/publish"
}
```

Common status codes:
- `200` — success
- `204` — success with no content
- `400` — validation error (bad request body)
- `401` — not authenticated (missing or invalid JWT)
- `403` — forbidden (authenticated but not allowed)
- `404` — resource not found
- `500` — server error

---

## Frontend API Layer Plan

Match endpoints with these files in `src/api/`:

| File | Endpoints |
|------|-----------|
| `auth.js` | signup, login |
| `user.js` | getMe |
| `dashboard.js` | getDashboard |
| `portfolio.js` | getPortfolio, updatePortfolio, updateSection |
| `files.js` | uploadFile, deleteFile, getFileUrl |
| `styles.js` | getStyles, getActiveStyle, saveStyle, activateStyle, deleteStyle |
| `github.js` | getGithubStatus, getConnectUrl |
| `publish.js` | getPublishStatus, suggestRepoName, validateRepo, publish, getTemplates |