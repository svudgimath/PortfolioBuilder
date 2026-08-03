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

### PUT `/portfolio`
**Protected** — replaces entire portfolio
Request body: same shape as GET response (minus id/userId/timestamps)
Response: updated PortfolioDocument

### PUT `/portfolio/{section}`
**Protected** — updates a single section
Sections: `meta`, `hero`, `about`, `skills`, `experience`, `education`, `projects`, `certifications`, `research`, `testimonials`, `contact`, `footer`
Request body: just that section's object
Response: full updated PortfolioDocument

**Example:**
```json
// PUT /portfolio/meta
{
  "displayName": "Alex Carter",
  "title": "Full Stack Engineer",
  "shortIntro": "I build things.",
  "location": "San Francisco",
  "profilePhoto": null,
  "openToWork": true,
  "resumeUrl": null,
  "website": null
}
```

### Section shapes (all optional fields)

**meta**
```
displayName, title, shortIntro, location, profilePhoto, openToWork, resumeUrl, website
```

**hero**
```
greeting, showProfilePhoto, cta: { primary: {label, href}, secondary: {label, href} },
socials: [{ platform, url }]
```

**about**
```
sectionLabel, sectionTitle, description: [String], 
whatIDo: [{ heading, brief }], highlights: [{ name, quant }], interests: [String]
```

**skills**
```
sectionLabel, sectionTitle, categorized, 
items: [{ category, tags: [String] }]
```

**experience**
```
sectionLabel, sectionTitle,
items: [{ id, company, role, startDate, endDate, location, 
         description: [String], tags: [String], companyLogo, companyUrl }]
```

**education**
```
sectionLabel, sectionTitle,
items: [{ id, institution, degree, fieldOfStudy, startDate, endDate, 
         location, grade, description: [String], tags: [String], logo }]
```

**projects**
```
sectionLabel, sectionTitle,
items: [{ id, projectName, description, tags: [String], liveUrl, repoUrl, 
         thumbnail, startDate, endDate, featured, githubRepo }]
```

**certifications**
```
sectionLabel, sectionTitle,
items: [{ id, name, description, issuer, dateIssued, expiryDate, 
         credentialUrl, thumbnail, tags: [String] }]
```

**research**
```
sectionLabel, sectionTitle,
items: [{ id, title, authors: [String], publishedIn, date, description, 
         tags: [String], url, doi }]
```

**testimonials**
```
sectionLabel, sectionTitle,
items: [{ id, name, role, company, message, avatar, linkedinUrl }]
```

**contact**
```
sectionLabel, heading, tagline, email, phone, socials: [{ platform, url }]
```

**footer**
```
customNote
```

---

## Styles

A `StyleDocument` carries metadata (id, portfolioId, userId, templateId, version, isActive,
generatedAt, prompt) plus the **8-group style payload**. The payload is the LLM-variable theme and
is the only part the published template reads:

```json
{
  "theme":      { "mode": "dark", "colors": { "bg": "...", "bgElevated": "...", "accent1": "...", "accent2": "...", "text": "...", "textDim": "...", "textMuted": "...", "shadow": "..." } },
  "typography": { "headingFont": "...", "bodyFont": "...", "googleFontsUrl": "...", "scale": "compact|balanced|expressive", "weight": "light|regular|strong", "headingCase": "none|uppercase-tracked" },
  "backdrop":   { "base": "solid|gradient-tone|duotone", "pattern": "none|grid|dots|topo", "glow": "none|corner|spotlight", "texture": "none|grain", "vignette": false },
  "depth":      { "elevation": "flat|ambient|layered", "shadowQuality": "soft|crisp", "surfaceContrast": "low|medium|high" },
  "surface":    { "radius": "sharp|soft|round", "borderWeight": "none|hairline|defined", "contentWidth": "narrow|standard|wide" },
  "components": { "card": "border|shadow|glass|tinted|clay", "tag": "outline|subtle|filled|shadow", "button": { "primary": "filled|gradient", "secondary": "outline|ghost" }, "sectionLabel": "line|badge|numbered", "socialIcon": "icon|outline|filled", "avatar": { "shape": "circle|rounded-square|blob", "frame": "none|ring|gradient-ring|glow|spotlight|backdrop|geometric-backdrop|dual-tone" } },
  "sections":   { "hero": "centered|split|split-with-meta-card|overlay-typographic|stacked-asymmetric", "experience": "timeline|split-rail|cards|compact", "education": "cards|compact", "projects": "grid|list|featured|bento|alternating", "certifications": "list|grid|badges", "research": "list|cards|compact", "testimonials": "grid|stack", "contact": "centered|card" },
  "motion":     { "intensity": "none|subtle|expressive", "entrance": "fade|slide-up|stagger|scale", "cardHover": "none|lift|accent-border", "linkHover": "none|underline|arrow", "counters": "off|on" }
}
```

> **Note:** the theme shape is nested (`theme.colors.bg`), not the legacy flat `theme.bg`.

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
    "theme": { "mode": "dark", "colors": { ... } },
    "typography": { ... },
    "backdrop": { ... },
    "depth": { ... },
    "surface": { ... },
    "components": { ... },
    "sections": { ... },
    "motion": { ... }
  }
]
```

### GET `/styles/active`
**Protected** — currently active style
Response: StyleDocument or 204 No Content if none

### POST `/styles`
**Protected** — save a new style (auto-versions, handles active toggle, keeps max 3 per user)
Request body: the 8-group style payload (id/version/generatedAt are set server-side)
Response: saved StyleDocument

### POST `/styles/generate`
**Protected** — generate a style from the user's portfolio via the LLM. **The new style is
automatically saved and activated** (any previously active style is deactivated). At most 5 styles
are kept per user — generating a 6th prunes the oldest *inactive* one.

```json
// Request (body optional — {} or omitted is valid)
{
  "prompt": "warm editorial serif, muted palette",  // optional, max 2000 chars — creative direction.
                                                     // If omitted/blank, a random curated direction is used.
  "model": "gemini-2.5-flash"                        // optional, max 100 chars. Unknown → default model (no error).
}

// Response 200
{
  "style": {
    "id": "styleId",                     // populated — the style has been saved
    "portfolioId": "...",
    "userId": "uuid",
    "version": 3,
    "isActive": true,                    // always true — this is now the active style
    "generatedAt": "2026-05-24T...",
    "prompt": "warm editorial serif, muted palette",
    "theme": {...}, "typography": {...}, "backdrop": {...}, "depth": {...},
    "surface": {...}, "components": {...}, "sections": {...}, "motion": {...}
  },
  "quota": {
    "remainingToday": 4,                 // 5 generations/day per user
    "remainingThisMinute": 4,
    "resetsAt": "2026-05-25T00:00:00Z"   // ISO instant — next daily reset (midnight UTC)
  }
}
```
The frontend does **not** need to follow up with `POST /styles` — that endpoint remains available for
manual edits of an existing style.

See **Error Responses → Style generation errors** for the failure modes to handle.

**Limits**
- 5 generations per minute (burst protection — all attempts count, including failures)
- 5 generations per day (only successful generations count; resets at midnight UTC)
- 5 styles retained per user (oldest inactive pruned automatically)
- Exactly 1 active style per user at any time

### PATCH `/styles/{styleId}/activate`
**Protected** — switch which style is active
Response: the activated StyleDocument

### DELETE `/styles/{styleId}`
**Protected**
Response: 204 No Content

---

## Files

Files (images + PDFs) are stored on **Cloudinary**. The backend uploads on the user's behalf
(validating size + magic bytes), returns the canonical `secure_url`, and the frontend persists
that URL directly into portfolio fields like `meta.profilePhoto`, `projects.items[].thumbnail`,
etc. The published portfolio and the preview both load images from the Cloudinary CDN directly.

### POST `/files/upload`
**Protected** — uploads a file. Multipart request with one `file` part.

- Allowed types: JPG, PNG, GIF, WebP, PDF (declared `Content-Type` checked AND magic-byte verified)
- Max size: **5 MB**

```json
// Response 200
{
  "url": "https://res.cloudinary.com/<cloud>/image/upload/v.../dzigned/users/<uuid>/photo_xyz.jpg",
  "publicId": "dzigned/users/<uuid>/photo_xyz",
  "resourceType": "image",       // "image" for JPG/PNG/GIF/WebP, "raw" for PDF
  "contentType": "image/jpeg",   // canonical type from magic-byte detection
  "filename": "headshot.jpg",
  "bytes": 184320
}
```

**Frontend usage:** save `url` into the relevant portfolio field. Keep `publicId` + `resourceType`
locally only if you plan to call DELETE before the next portfolio save (otherwise orphan cleanup
handles it).

```json
// Error 400 — too large
{ "status": 400, "error": "Bad Request", "message": "File size exceeds 5MB limit", ... }

// Error 400 — unsupported type
{ "status": 400, "error": "Bad Request", "message": "File type not allowed. Use JPG, PNG, GIF, WebP, or PDF.", ... }

// Error 502 — Cloudinary upload failed
{ "status": 502, "error": "Bad Gateway", "message": "File upload failed. Please try again.", ... }
```

### DELETE `/files`
**Protected** — explicitly delete a Cloudinary asset.

Query params:
- `publicId` (required) — the `publicId` returned by upload
- `resourceType` (optional, defaults to `image`) — pass `raw` for PDFs

```
DELETE /api/files?publicId=dzigned/users/abc/resume_xyz&resourceType=raw
→ 204 No Content
```

> **You usually don't need this** — when a portfolio is saved (PUT `/portfolio` or PUT `/portfolio/{section}`),
> the backend diffs `before` vs `after` Cloudinary URLs and auto-deletes any that were removed. Call
> DELETE explicitly only when the user discards an upload *before* saving the portfolio (e.g. they
> upload a photo, then pick a different one without hitting Save).

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
**Public** — redirects to GitHub OAuth. Frontend navigates to this URL (full page redirect, not XHR). Token is passed as query param because the browser will follow the redirect chain.

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
// mode = "FULL" (push template + data) or "CONTENT_ONLY" (push only JSON data)

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

> **Exception:** the `401` body is shorter — `{ "status": 401, "error": "Unauthorized", "message": "Authentication required" }` (no `timestamp`/`path`).

### Style generation errors

`POST /styles/generate` returns a **different, LLM-specific error shape** for provider/rate-limit
failures: `{ "error": "<code>", "message": "<text>", ... }` (a string `error` code, no `status`/`path`/`timestamp`).

| HTTP | `error` | Extra fields | Meaning | Suggested handling |
|---|---|---|---|---|
| 429 | `rate_limit_minute` | `retryAfter` (seconds) + `Retry-After` header | Per-minute burst limit hit | Disable the button for `retryAfter`s; show a countdown |
| 429 | `rate_limit_daily` | `resetsAt` (ISO instant) | Daily generation cap reached | Disable until `resetsAt`; show "resets at midnight UTC" |
| 503 | `service_busy` | `retryAfter: 30` + `Retry-After` header | Provider rate-limited after retries | Offer "try again in 30s" |
| 504 | `service_timeout` | — | Provider timed out | Offer an immediate retry |
| 500 | `generation_failed` | — | Model returned unusable output | Offer retry; if it persists, surface a generic error |

These still use the **standard** error shape (`{ status, error, message, path, timestamp }`):

| HTTP | When | `message` example |
|---|---|---|
| 400 | No portfolio saved yet | `Create your portfolio before generating a style` |
| 400 | Validation (`prompt` > 2000 or `model` > 100 chars) | `prompt: Prompt must be at most 2000 characters` |
| 401 | Missing/expired/invalid JWT | `Authentication required` |

**Branching tip:** if the body has a string `error` field → LLM-specific shape (use `error` + `retryAfter`/`resetsAt`); otherwise standard shape (use `status` + `message`). For 429/503, prefer the `Retry-After` header when present.

---

## Frontend API Layer Plan

Match endpoints with these files in `src/api/`:

| File | Endpoints |
|------|-----------|
| `auth.js` | signup, login |
| `user.js` | getMe |
| `portfolio.js` | getPortfolio, updatePortfolio, updateSection |
| `styles.js` | getStyles, getActiveStyle, saveStyle, generateStyle, activateStyle, deleteStyle |
| `files.js` | uploadFile, deleteFile |
| `github.js` | getGithubStatus, getConnectUrl |
| `publish.js` | getPublishStatus, suggestRepoName, validateRepo, publish, getTemplates |
