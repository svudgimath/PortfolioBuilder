# Dzigned — Template Developer Reference

This document is the single source of truth for building and maintaining portfolio templates.
It covers the full data schema, style system, rendering rules, and how data reaches the template.

---

## How Data Reaches the Template

### Preview mode (editor iframe)
The backend renders the template server-side and injects portfolio + style data.
Template has direct access to the full data at render time — no client fetch needed.

Preview endpoint: `GET /api/preview/{userId}`

### Published mode (GitHub Pages static site)
On publish the backend:
1. Copies the template files into the GitHub repo
2. Writes portfolio data to `data/portfolio.json`
3. Writes active style to `data/style.json`
4. Copies uploaded files from GridFS to `assets/images/{fileId}.{ext}`
5. Rewrites all `fileId` references in the JSON to `assets/images/{fileId}.{ext}`

Template reads data from those static JSON files at load time.

### File URL resolution

| Context | URL format |
|---------|-----------|
| Preview | `/api/files/{fileId}` |
| Published | `assets/images/{fileId}.{ext}` (rewritten by publisher, no manual handling needed) |

**Always null-check file fields before rendering** — users are not required to upload photos.

---

## Portfolio Data Schema

Any top-level section the user hasn't filled yet is `null`. Always guard:
```js
if (portfolio.experience) { /* render */ }
```

---

### `meta`
Required section. Always present once the user completes onboarding.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `displayName` | string | yes | Full name shown in hero |
| `title` | string | yes | Professional title / role |
| `shortIntro` | string | yes | 1–2 sentence bio |
| `location` | string | no | |
| `website` | string | no | Personal site URL |
| `profilePhoto` | fileId | no | Image — resolve to URL |
| `resume` | fileId | no | PDF — use as download link |
| `openToWork` | boolean | no | Show "available for opportunities" badge when true |

---

### `hero`
Required section.

| Field | Type | Notes |
|-------|------|-------|
| `greeting` | string | Default: `"Hi, I'm"` — shown before the display name |
| `showProfilePhoto` | boolean | If false, do not render the profile photo even if `meta.profilePhoto` exists |
| `cta.primary` | `{ label, href }` \| null | CTA button — null means don't render |
| `cta.secondary` | `{ label, href }` \| null | CTA button — null means don't render |
| `socials` | `{ platform, url }[]` | Subset of contact socials chosen by the user |

`href` values are either section anchors (`#about`, `#projects`, etc.), `/api/files/{fileId}` for resume download, or external URLs.

---

### `about`
Optional section.

| Field | Type | Notes |
|-------|------|-------|
| `sectionLabel` | string | Default: `"About Me"` — small label above the title |
| `sectionTitle` | string | Default: `"A little about who I am"` |
| `description` | string[] | Array of paragraph strings. Render each as a `<p>`. At least one entry. |
| `whatIDo` | `{ heading, brief }[]` | Service/skill cards. May be empty array. |
| `highlights` | `{ name, quant }[]` | Stat callouts e.g. `{ name: "Projects shipped", quant: "20+" }`. May be empty. |
| `interests` | string[] | Tag-style list of personal interests. May be empty. |

---

### `skills`
Optional section.

| Field | Type | Notes |
|-------|------|-------|
| `sectionLabel` | string | Default: `"Skills"` |
| `sectionTitle` | string | Default: `"What I bring to the table"` |
| `categorized` | boolean | Controls rendering mode (see below) |
| `items` | `{ category, tags }[]` | At least one item |

**Rendering rules:**
- `categorized: true` — render each item as a heading (`category`) with its `tags` below
- `categorized: false` — single item with `category: ""`, flatten all `tags` into one tag cloud; ignore the category field entirely

---

### `experience`
Optional section.

| Field | Type | Notes |
|-------|------|-------|
| `sectionLabel` | string | Default: `"Work Experience"` |
| `sectionTitle` | string | Default: `"My professional journey so far"` |
| `items` | ExperienceItem[] | Ordered as entered by user (most recent first recommended) |

**ExperienceItem**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | — | For keying, not displayed |
| `company` | string | yes | |
| `role` | string | yes | |
| `startDate` | string | no | Free-text e.g. `"Jan 2022"` |
| `endDate` | string | no | Null when `current: true` |
| `current` | boolean | no | If true, show `"Present"` in place of endDate |
| `location` | string | no | |
| `companyUrl` | string | no | Make company name a link |
| `companyLogo` | fileId | no | Image |
| `description` | string[] | no | Bullet points — render as `<ul><li>` |
| `tags` | string[] | no | Technologies / skills used |

---

### `education`
Optional section.

| Field | Type | Notes |
|-------|------|-------|
| `sectionLabel` | string | Default: `"Education"` |
| `sectionTitle` | string | Default: `"My academic background"` |
| `items` | EducationItem[] | |

**EducationItem**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | — | |
| `institution` | string | yes | |
| `degree` | string | yes | |
| `fieldOfStudy` | string | no | |
| `startDate` | string | no | |
| `endDate` | string | no | |
| `location` | string | no | |
| `grade` | string | no | GPA, percentage, distinction, etc. |
| `logo` | fileId | no | Institution logo — image |
| `description` | string[] | no | Bullet points |
| `tags` | string[] | no | Coursework, specialisations, etc. |

---

### `projects`
Optional section.

| Field | Type | Notes |
|-------|------|-------|
| `sectionLabel` | string | Default: `"Projects"` |
| `sectionTitle` | string | Default: `"Things I have built"` |
| `items` | ProjectItem[] | |

**ProjectItem**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | — | |
| `projectName` | string | yes | |
| `description` | string | yes | Single block of text (not an array) |
| `startDate` | string | no | |
| `endDate` | string | no | |
| `liveUrl` | string | no | Deployed site link |
| `repoUrl` | string | no | Source code link |
| `thumbnail` | fileId | no | Project screenshot — image |
| `featured` | boolean | no | Highlight or pin at top when true |
| `tags` | string[] | no | Tech stack |

---

### `certifications`
Optional section.

| Field | Type | Notes |
|-------|------|-------|
| `sectionLabel` | string | Default: `"Certifications & Achievements"` |
| `sectionTitle` | string | Default: `"Credentials and recognition"` |
| `items` | CertificationItem[] | |

**CertificationItem**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | — | |
| `name` | string | yes | |
| `issuer` | string | yes | |
| `description` | string | no | Single text block |
| `dateIssued` | string | no | |
| `expiryDate` | string | no | Null = no expiry |
| `credentialUrl` | string | no | Verify link |
| `thumbnail` | fileId | no | Badge / certificate image |
| `tags` | string[] | no | |

---

### `research`
Optional section.

| Field | Type | Notes |
|-------|------|-------|
| `sectionLabel` | string | Default: `"Research & Publications"` |
| `sectionTitle` | string | Default: `"My contributions to the field"` |
| `items` | ResearchItem[] | |

**ResearchItem**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | — | |
| `title` | string | yes | Paper / article title |
| `authors` | string[] | no | List of author name strings |
| `publishedIn` | string | no | Journal / conference name |
| `date` | string | no | Publication date |
| `description` | string | no | Abstract / summary |
| `url` | string | no | Link to paper |
| `doi` | string | no | Render as `https://doi.org/{doi}` |
| `tags` | string[] | no | |

---

### `testimonials`
Optional section.

| Field | Type | Notes |
|-------|------|-------|
| `sectionLabel` | string | Default: `"Testimonials"` |
| `sectionTitle` | string | Default: `"What people say about me"` |
| `items` | TestimonialItem[] | |

**TestimonialItem**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | — | |
| `name` | string | yes | Person's name |
| `message` | string | yes | The testimonial text |
| `role` | string | no | Job title |
| `company` | string | no | |
| `avatar` | fileId | no | Headshot — image |
| `linkedinUrl` | string | no | Link their name to LinkedIn |

---

### `contact`
Required section.

| Field | Type | Notes |
|-------|------|-------|
| `sectionLabel` | string | Default: `"Get In Touch"` |
| `heading` | string | Default: `"Let's build something great together."` |
| `tagline` | string | no | Subtext under the heading |
| `email` | string | no | Render as `mailto:` link |
| `phone` | string | no | Render as `tel:` link |
| `socials` | `{ platform, url }[]` | May be empty |

At least one of `email`, `phone`, or `socials` will be present.

---

### `footer`
Required section.

| Field | Type | Notes |
|-------|------|-------|
| `customNote` | string | no | Personal quote or tagline alongside "Built with Dzigned" |

Always render the "Built with Dzigned" attribution. `customNote` is additive.

---

## Social Platforms

Valid values for `platform` in `hero.socials` and `contact.socials`:

**Social**
`github`, `linkedin`, `twitter`, `instagram`, `facebook`, `youtube`, `twitch`, `discord`

**Creative & Design**
`dribbble`, `behance`, `figma`

**Writing & Publishing**
`medium`, `devto`, `hashnode`, `substack`

**Developer / Competitive**
`producthunt`, `leetcode`, `hackerrank`, `codeforces`, `kaggle`, `stackoverflow`

Use the platform string to pick the matching icon. All platforms have a `url` that links directly.

---

## Style Schema

Loaded from `data/style.json` (published) or injected at preview render time.

```json
{
  "templateId": "string",
  "theme": { ... },
  "background": { ... },
  "components": { ... },
  "sections": { ... }
}
```

### `theme`
CSS variable values — apply to `:root` or pass into your styling system.

| Token | Notes |
|-------|-------|
| `bg` | Page background colour |
| `text` | Primary text colour |
| `textDim` | Secondary / label text |
| `textMuted` | Placeholder / hint text |
| `accent1` | Primary accent (buttons, highlights) |
| `accent2` | Secondary accent |
| `card` | Card / surface background |
| `border` | Border / divider colour |
| `fontHeading` | Google Font name for headings |
| `fontBody` | Google Font name for body text |

### `background.style`
Applies to the page or hero background.

| Value | Render as |
|-------|-----------|
| `mesh` | Radial gradient mesh |
| `dots` | Dot grid pattern |
| `gradient` | Linear gradient |
| `solid` | Flat `bg` colour, no decoration |
| `noise` | Subtle noise texture overlay |

### `components`
Per-component style variants. Each entry has `style` and optional `quantColor`.

#### `card.style`
| Value | Render as |
|-------|-----------|
| `border` | Thin border, no shadow |
| `shadow` | Drop shadow, no border |
| `flat` | No border, no shadow, filled background |
| `glass` | Frosted glass — semi-transparent with blur |

#### `button.style`
| Value | Render as |
|-------|-----------|
| `filled` | Solid `accent1` background |
| `outlined` | Transparent with `accent1` border |
| `ghost` | No border, text colour only |

#### `sectionLabel.style`
The small label that appears above section titles (e.g. "About Me").

| Value | Render as |
|-------|-----------|
| `pill` | Rounded pill chip with subtle background |
| `underline` | Plain text with accent underline |
| `plain` | Uppercase small text, no decoration |

#### `achievementTag.style`
Tags shown on experience, education, projects, etc.

| Value | Render as |
|-------|-----------|
| `glow` | Pill with accent glow/shadow |
| `plain` | Flat filled pill |
| `outline` | Border-only pill |

#### `achievementTag.quantColor`
Controls colour of highlight/quant values (e.g. stats in the about section).

| Value | Render as |
|-------|-----------|
| `gradient` | Gradient text |
| `accent1` | Solid accent1 colour |
| `accent2` | Solid accent2 colour |
| `null` | Default text colour |

#### `socialIcon.style`
| Value | Render as |
|-------|-----------|
| `icon` | Icon only, no label |
| `pill` | Icon + platform name in a pill |
| `text` | Text link only |

### `sections`
Per-section layout variants.

#### `experience`
| `variant` | Layout |
|-----------|--------|
| `timeline` | Vertical timeline with connector line |
| `cards` | Card grid |
| `compact` | Dense list, no visual timeline |

#### `education`
| `variant` | Layout |
|-----------|--------|
| `cards` | Card per institution |
| `compact` | Dense list |

#### `projects`
| `variant` | Layout |
|-----------|--------|
| `grid` | Equal-size card grid |
| `list` | Full-width list entries |
| `masonry` | Variable-height masonry grid |

#### `certifications`
| `variant` | Layout |
|-----------|--------|
| `grid` | Card grid with badge thumbnail |
| `list` | Compact list |

#### `research`
| `variant` | Layout |
|-----------|--------|
| `list` | Academic paper list style |
| `cards` | Card per paper |

#### `testimonials`
| `variant` | Layout |
|-----------|--------|
| `grid` | Fixed card grid |
| `carousel` | Horizontal scroll / slider |
| `list` | Stacked quote blocks |

#### `contact`
| `variant` | Layout |
|-----------|--------|
| `centered` | Centred heading + email/socials below |
| `split` | Left: text / Right: form or links |
| `minimal` | Email link only, minimal chrome |

#### `entryStyle` (all sections)
Applied per item card within a section.

| Value | Render as |
|-------|-----------|
| `border` | Card with border |
| `shadow` | Card with drop shadow |
| `glow` | Card with accent glow |
| `none` | No card chrome, content only |

---

## Rendering Checklist

- [ ] Guard every top-level section for null before rendering
- [ ] Guard every optional field (`?? ""` or conditional block)
- [ ] File fields: always wrap in null check; resolve via `/api/files/{id}` (preview) or `assets/images/` (published)
- [ ] `experience[].current === true` → show "Present" instead of endDate
- [ ] `hero.showProfilePhoto === false` → hide profile photo in hero even if `meta.profilePhoto` exists
- [ ] `meta.openToWork === true` → show "Open to Work" / "Available" badge
- [ ] `projects[].featured === true` → visually highlight or sort to front
- [ ] `skills.categorized === false` → render as flat tag cloud, ignore `items[].category`
- [ ] `hero.cta.primary === null` → don't render primary CTA button
- [ ] `research[].doi` → link as `https://doi.org/{doi}`
- [ ] `footer.customNote` → render alongside mandatory "Built with Dzigned" attribution
- [ ] Apply `theme` fonts by loading from Google Fonts: `fontHeading` for headings, `fontBody` for body
- [ ] Apply `background.style` to hero or full page background
- [ ] `description` in experience / education items is `string[]` — render as bullet list `<ul><li>`
- [ ] `description` in projects / certifications / research is a plain `string` — render as paragraph
