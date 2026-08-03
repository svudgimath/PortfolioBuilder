// Data-driven section definitions for the always-guided portfolio editor.
// buildSectionDefs(portfolio) is called reactively so Hero CTA options
// and social-select lists reflect the latest saved portfolio state.
//
// Flow order grouped by top-bar tab:
//   Profile   → meta
//   About     → about → skills
//   Work      → experience → education
//   Portfolio → projects → certifications → research → testimonials
//   Contact   → contact → footer
//   Hero      → hero  (last — needs CTA options and socials already saved)

export const SECTION_ORDER = [
  'meta',
  'about','skills',
  'experience','education',
  'projects','certifications','research','testimonials',
  'contact','footer',
  'hero',
]

export const REQUIRED_SECTIONS = new Set(['meta','contact','hero'])

// Maps a section key to the top-bar tab key
export const SECTION_TO_TAB = {
  meta: 'profile',
  about: 'about',  skills: 'about',
  experience: 'work', education: 'work',
  projects: 'portfolio', certifications: 'portfolio', research: 'portfolio', testimonials: 'portfolio',
  contact: 'contact', footer: 'contact',
  hero: 'hero',
}

function buildCtaOptions(portfolio) {
  const opts = []
  if (portfolio?.about)                          opts.push({ label: 'About Me',      href: '#about' })
  if (portfolio?.experience?.items?.length)      opts.push({ label: 'My Experience', href: '#experience' })
  if (portfolio?.projects?.items?.length)        opts.push({ label: 'View My Work',  href: '#projects' })
  if (portfolio?.skills?.items?.length)          opts.push({ label: 'My Skills',     href: '#skills' })
  if (portfolio?.research?.items?.length)        opts.push({ label: 'Research',      href: '#research' })
  if (portfolio?.meta?.resume)                   opts.push({ label: 'Download Resume', href: portfolio.meta.resume })
  opts.push({ label: 'Get In Touch', href: '#contact' })
  return opts
}

export function buildSectionDefs(portfolio, user) {
  const ctaOptions     = buildCtaOptions(portfolio)
  const contactSocials = (portfolio?.contact?.socials || []).filter(s => s.platform)

  return [
    // ── META ─────────────────────────────────────────────────────────────────
    {
      key: 'meta', label: 'Profile', required: true, mode: 'steps',
      intro: {
        emoji: '👋',
        description: "The foundation of your portfolio — your name, professional title, and a one-liner that tells the world exactly who you are.",
        tip: "Use your real professional name. This is what recruiters and clients will search for.",
      },
      steps: [
        {
          heading: "Let's start with you",
          subtitle: "The essentials — this is how you'll introduce yourself to the world.",
          fields: [
            { key: 'displayName', label: 'Your full name',           type: 'text', required: true, maxLength: 200, placeholder: 'e.g. Priya Sharma',
              hint: "The name displayed across your portfolio — use whatever you go by professionally" },
            { key: 'title',       label: 'Your professional title',   type: 'text', required: true, maxLength: 200, placeholder: 'e.g. Product Designer, Marketing Strategist, Data Analyst',
              hint: "What you do in one line — this appears right below your name" },
            { key: 'shortIntro',  label: 'A one-liner about you',     type: 'text', required: true, maxLength: 280, placeholder: "e.g. I help teams build products people actually love.",
              hint: "Think of it as your elevator pitch — short, memorable, and uniquely you" },
          ],
        },
        {
          heading: "A few finishing details",
          subtitle: "Optional, but these small touches make a big difference.",
          fields: [
            { key: 'profilePhoto', label: 'Profile photo',            type: 'avatar',
              hint: "Square crop works best — minimum 400×400px" },
            { key: 'location',     label: 'Where are you based?',      type: 'text',   maxLength: 200, placeholder: 'e.g. London, UK', half: true },
            { key: 'website',      label: 'Personal website',          type: 'url',    maxLength: 1000, placeholder: 'e.g. https://yourname.com', half: true },
            { key: 'openToWork',   label: "I'm open to opportunities", type: 'toggle',
              description: "Adds a visible 'available' badge to your portfolio" },
            { key: 'resume',       label: 'Upload your resume',        type: 'file',   accept: '.pdf,application/pdf', maxSizeMB: 5,
              hint: "PDF only · Max 5MB" },
          ],
        },
      ],
      initData(e) {
        return {
          displayName:  e?.displayName  || user?.name  || '',
          title:        e?.title        || '',
          shortIntro:   e?.shortIntro   || '',
          profilePhoto: e?.profilePhoto || null,
          location:     e?.location     || '',
          openToWork:   e?.openToWork   ?? false,
          website:      e?.website      || '',
          resume:       e?.resume       || null,
        }
      },
      transform(f) { return { ...f } },
    },

    // ── ABOUT ─────────────────────────────────────────────────────────────────
    {
      key: 'about', label: 'About', required: false, mode: 'steps',
      intro: {
        emoji: '📖',
        description: "Tell your story. A short bio that captures your passion, background, and what makes you uniquely you.",
        tip: "Write in first person — 'I build...' feels more human than 'She builds...'",
      },
      skipText: "Skip for now — add it later",
      steps: [
        {
          heading: "Tell people who you are",
          subtitle: "Write naturally — imagine you're introducing yourself over coffee, not in a job interview.",
          fields: [
            { key: 'sectionLabel', label: 'What should this section be called?', type: 'text', maxLength: 200, placeholder: 'e.g. About Me', half: true,
              hint: 'The main heading visitors see at the top of this section' },
            { key: 'sectionTitle', label: 'A tagline below it', type: 'text', maxLength: 200, placeholder: 'e.g. The story so far', half: true,
              hint: 'A one-liner set just under the heading — optional but adds personality' },
            { key: 'description',  label: 'About you', type: 'multi-text', required: true, minItems: 1, maxLength: 5000,
              placeholder: "Write a paragraph about your background, what drives you, and what you're working on…", multiline: true,
              hint: "2–3 paragraphs works great. Each one becomes its own block — keep them focused." },
          ],
        },
        {
          heading: "Show what you bring to the table",
          subtitle: "Highlight your specialties and let the numbers do the talking.",
          fields: [
            { key: 'whatIDo',    label: 'Your specialties',    type: 'dynamic-pairs',
              hint: "The things you're known for — your core skills or services",
              subfields: [{ key: 'heading', placeholder: 'e.g. Brand Strategy, UX Research, Cloud Architecture', half: true, maxLength: 200 }, { key: 'brief', placeholder: 'What this involves in one sentence', half: true, maxLength: 500 }] },
            { key: 'highlights', label: 'Key numbers', type: 'dynamic-pairs',
              hint: "Stats that tell your story — years of experience, clients served, projects completed",
              subfields: [{ key: 'name', placeholder: 'e.g. Projects Delivered, Clients Served', half: true, maxLength: 200 }, { key: 'quant', placeholder: 'e.g. 50+, 12', half: true, maxLength: 100 }] },
            { key: 'interests',  label: 'Interests & hobbies', type: 'tags', placeholder: 'Type an interest and press Enter',
              hint: "What you do outside of work — adds personality to your profile" },
          ],
        },
      ],
      initData(e) {
        return {
          sectionLabel: e?.sectionLabel || 'About Me',
          sectionTitle: e?.sectionTitle || 'A little about who I am',
          description:  e?.description  || [],
          whatIDo:      e?.whatIDo      || [],
          highlights:   e?.highlights   || [],
          interests:    e?.interests    || [],
        }
      },
      transform(f) { return { ...f } },
    },

    // ── SKILLS ────────────────────────────────────────────────────────────────
    {
      key: 'skills', label: 'Skills', required: false, mode: 'steps',
      intro: {
        emoji: '⚡',
        description: "Show what you can do. Tools, technologies, methods, platforms — skills help people find you and trust you.",
        tip: "Focus on skills you'd want to use in your next role, not every tool you've ever touched.",
      },
      skipText: "Skip for now",
      steps: [
        {
          heading: "What are you great at?",
          subtitle: "Tools, technologies, methods, platforms — anything you'd want someone to know you can do.",
          fields: [
            { key: 'sectionLabel', label: 'What do you want to call this section?', type: 'text', maxLength: 200, placeholder: 'e.g. Skills', half: true,
              hint: 'The main heading visitors see at the top of this section' },
            { key: 'sectionTitle', label: 'Give it a tagline', type: 'text', maxLength: 200, placeholder: 'e.g. My toolkit', half: true,
              hint: 'A one-liner just below the heading — keeps it punchy' },
            { key: '_skills', label: '', type: 'skills-builder' },
          ],
        },
      ],
      initData(e) {
        const isCat = e?.categorized !== false
        return {
          sectionLabel: e?.sectionLabel || 'Skills',
          sectionTitle: e?.sectionTitle || 'What I bring to the table',
          _categorized: isCat,
          _categories:  isCat ? (e?.items || []) : [],
          _flatTags:    !isCat ? (e?.items||[]).flatMap(i => i.tags||[]) : [],
        }
      },
      transform(f) {
        return {
          sectionLabel: f.sectionLabel,
          sectionTitle: f.sectionTitle,
          categorized:  f._categorized,
          items: f._categorized
            ? f._categories
            : [{ id: 'uncategorized', category: '', tags: f._flatTags || [] }],
        }
      },
    },

    // ── EXPERIENCE ────────────────────────────────────────────────────────────
    {
      key: 'experience', label: 'Experience', required: false, mode: 'items',
      intro: {
        emoji: '💼',
        description: "Your work history. Highlight the roles you've held, what you built, and what you accomplished along the way.",
        tip: "Lead with impact — what changed because you were there? Numbers speak louder than job descriptions.",
      },
      skipText: "Skip for now",
      addAnotherPrompt: "Want to add another role?",
      itemSteps: [
        {
          heading: "Where have you worked?",
          headingAlt: "Add another role",
          subtitle: "The basics — company, role, and when.",
          fields: [
            { key: 'company',   label: 'Company or organization', type: 'text', required: true, maxLength: 200, placeholder: 'e.g. Acme Corp', half: true },
            { key: 'role',      label: 'Your role',    type: 'text', required: true, maxLength: 200, placeholder: 'e.g. Lead Designer, Operations Manager, Software Engineer', half: true },
            { key: 'startDate', label: 'From',         type: 'text', maxLength: 100, counter: false, placeholder: 'e.g. Jan 2021',   half: true },
            { key: 'endDate',   label: 'To',           type: 'text', maxLength: 100, counter: false, placeholder: 'e.g. Dec 2023 or Present', half: true },
            { key: 'current',   label: "I currently work here", type: 'toggle' },
            { key: 'location',  label: 'Location',     type: 'text', maxLength: 200, placeholder: 'e.g. Remote, New York, Singapore' },
            { key: 'companyLogo', label: 'Company logo', type: 'file', accept: 'image/*', maxSizeMB: 5,
              hint: "Optional — adds a logo next to this role" },
          ],
        },
        {
          heading: "What impact did you make?",
          subtitle: "Focus on outcomes and achievements — what changed because you were there?",
          fields: [
            { key: 'description', label: 'Key contributions', type: 'multi-text', maxLength: 2000, placeholder: 'e.g. Redesigned the onboarding flow, increasing activation by 35%',
              hint: "Lead with impact — what you did and what it achieved. One point per line." },
            { key: 'tags',        label: 'Skills & tools used', type: 'tags', placeholder: 'Type a skill or tool and press Enter',
              hint: "What you worked with in this role — each becomes a tag" },
            { key: 'companyUrl',  label: 'Company website',  type: 'url',  maxLength: 1000, placeholder: 'https://…' },
          ],
        },
      ],
      initItemData: () => ({ company:'', role:'', startDate:'', endDate:'', current:false, location:'', description:[], tags:[], companyUrl:'', companyLogo:null }),
      itemTransform: d => ({ id: crypto.randomUUID(), company: d.company||'', role: d.role||'', startDate: d.startDate||'', endDate: d.endDate||'', current: !!d.current, location: d.location||'', description: (d.description||[]).filter(Boolean), tags: d.tags||[], companyUrl: d.companyUrl||'', companyLogo: d.companyLogo || null }),
      sectionConfigFields: [
        { key: 'sectionLabel', label: 'What do you want to call this section?', type: 'text', maxLength: 200, placeholder: 'Work Experience',                half: true },
        { key: 'sectionTitle', label: 'Give it a tagline',                      type: 'text', maxLength: 200, placeholder: 'My professional journey so far', half: true },
      ],
      initSectionConfig: (e) => ({ sectionLabel: e?.sectionLabel||'Work Experience', sectionTitle: e?.sectionTitle||'My professional journey so far' }),
      sectionWrapper: (items, e, config) => ({ sectionLabel: config?.sectionLabel||e?.sectionLabel||'Work Experience', sectionTitle: config?.sectionTitle||e?.sectionTitle||'My professional journey so far', items: [...(e?.items||[]), ...items] }),
    },

    // ── EDUCATION ─────────────────────────────────────────────────────────────
    {
      key: 'education', label: 'Education', required: false, mode: 'items',
      intro: {
        emoji: '🎓',
        description: "Your academic background. Degrees, diplomas, bootcamps, online courses — whatever shaped your knowledge.",
      },
      skipText: "Skip for now",
      addAnotherPrompt: "Add another qualification?",
      itemSteps: [
        {
          heading: "Where did you study?",
          headingAlt: "Add another qualification",
          subtitle: "Degrees, diplomas, bootcamps, professional courses — all count.",
          fields: [
            { key: 'institution',  label: 'Institution',  type: 'text', required: true, maxLength: 200, placeholder: 'e.g. University of Melbourne, General Assembly', half: true },
            { key: 'degree',       label: 'Qualification', type: 'text', required: true, maxLength: 200, placeholder: 'e.g. Bachelor of Arts, Professional Certificate', half: true },
            { key: 'fieldOfStudy', label: 'Field of study', type: 'text', maxLength: 200, placeholder: 'e.g. Marketing, Computer Science, Visual Communication', half: true },
            { key: 'grade',        label: 'Grade or distinction', type: 'text', maxLength: 200, placeholder: 'e.g. First Class Honours, 3.8 GPA', half: true },
            { key: 'startDate',    label: 'From',                type: 'text', maxLength: 100, counter: false, placeholder: 'e.g. Sep 2018', half: true },
            { key: 'endDate',      label: 'To',                  type: 'text', maxLength: 100, counter: false, placeholder: 'e.g. May 2022', half: true },
            { key: 'location',     label: 'Location',            type: 'text', maxLength: 200, placeholder: 'e.g. Melbourne, Australia' },
            { key: 'logo',         label: 'Institution logo',    type: 'file', accept: 'image/*', maxSizeMB: 5,
              hint: "Optional — looks great alongside the entry" },
            { key: 'description',  label: 'Notable details',     type: 'multi-text', maxLength: 2000, placeholder: "e.g. Dean's List, thesis topic, key coursework",
              hint: "Awards, thesis, relevant projects — things that set you apart" },
            { key: 'tags',         label: 'Key subjects',        type: 'tags', placeholder: 'Type a subject and press Enter' },
          ],
        },
      ],
      initItemData: () => ({ institution:'', degree:'', fieldOfStudy:'', grade:'', startDate:'', endDate:'', location:'', description:[], tags:[], logo:null }),
      itemTransform: d => ({ id: crypto.randomUUID(), institution: d.institution||'', degree: d.degree||'', fieldOfStudy: d.fieldOfStudy||'', grade: d.grade||'', startDate: d.startDate||'', endDate: d.endDate||'', location: d.location||'', description: (d.description||[]).filter(Boolean), tags: d.tags||[], logo: d.logo || null }),
      sectionConfigFields: [
        { key: 'sectionLabel', label: 'What do you want to call this section?', type: 'text', maxLength: 200, placeholder: 'Education',             half: true },
        { key: 'sectionTitle', label: 'Give it a tagline',                      type: 'text', maxLength: 200, placeholder: 'My academic background', half: true },
      ],
      initSectionConfig: (e) => ({ sectionLabel: e?.sectionLabel||'Education', sectionTitle: e?.sectionTitle||'My academic background' }),
      sectionWrapper: (items, e, config) => ({ sectionLabel: config?.sectionLabel||e?.sectionLabel||'Education', sectionTitle: config?.sectionTitle||e?.sectionTitle||'My academic background', items: [...(e?.items||[]), ...items] }),
    },

    // ── PROJECTS ──────────────────────────────────────────────────────────────
    {
      key: 'projects', label: 'Projects', required: false, mode: 'items',
      intro: {
        emoji: '🗂️',
        description: "Your best work on display. Work projects, side projects, collaborations — anything you're proud of.",
        tip: "One great project with a live link beats five half-described ones.",
      },
      skipText: "Skip for now",
      addAnotherPrompt: "Add another project?",
      itemSteps: [
        {
          heading: "What have you created?",
          headingAlt: "Add another project",
          subtitle: "Work projects, side projects, collaborations — anything you're proud of.",
          fields: [
            { key: 'projectName', label: 'Project name', type: 'text', required: true, maxLength: 200, placeholder: 'e.g. Rebrand for Acme, Personal Finance Tracker' },
            { key: 'description', label: 'What is it?', type: 'textarea', required: true, maxLength: 5000, placeholder: 'A clear description — what it does and why it matters',
              hint: "One or two sentences that would make someone want to click and learn more" },
            { key: 'thumbnail',   label: 'Cover image', type: 'file', accept: 'image/*', maxSizeMB: 5,
              hint: "A screenshot, mockup, or photo — the first thing people see" },
            { key: 'startDate',   label: 'From', type: 'text', maxLength: 100, counter: false, placeholder: 'e.g. Jan 2023', half: true },
            { key: 'endDate',     label: 'To',   type: 'text', maxLength: 100, counter: false, placeholder: 'e.g. Present', half: true },
            { key: 'featured',    label: 'Feature this project', type: 'toggle' },
          ],
        },
        {
          heading: "Add links and tags",
          subtitle: "Help people explore your work further.",
          fields: [
            { key: 'liveUrl', label: 'Live link',            type: 'url', maxLength: 1000, placeholder: 'https://…', half: true },
            { key: 'repoUrl', label: 'Source or case study', type: 'url', maxLength: 1000, placeholder: 'https://…', half: true },
            { key: 'tags',    label: 'Skills & tools',        type: 'tags', placeholder: 'Type a skill or tool and press Enter',
              hint: "What you used to build it — each becomes a tag" },
          ],
        },
      ],
      initItemData: () => ({ projectName:'', description:'', startDate:'', endDate:'', featured:false, liveUrl:'', repoUrl:'', tags:[], thumbnail:null }),
      itemTransform: d => ({ id: crypto.randomUUID(), projectName: d.projectName||'', description: d.description||'', startDate: d.startDate||'', endDate: d.endDate||'', featured: !!d.featured, liveUrl: d.liveUrl||'', repoUrl: d.repoUrl||'', tags: d.tags||[], thumbnail: d.thumbnail || null }),
      sectionConfigFields: [
        { key: 'sectionLabel', label: 'What do you want to call this section?', type: 'text', maxLength: 200, placeholder: 'Projects',            half: true },
        { key: 'sectionTitle', label: 'Give it a tagline',                      type: 'text', maxLength: 200, placeholder: 'Things I have built', half: true },
      ],
      initSectionConfig: (e) => ({ sectionLabel: e?.sectionLabel||'Projects', sectionTitle: e?.sectionTitle||'Things I have built' }),
      sectionWrapper: (items, e, config) => ({ sectionLabel: config?.sectionLabel||e?.sectionLabel||'Projects', sectionTitle: config?.sectionTitle||e?.sectionTitle||'Things I have built', items: [...(e?.items||[]), ...items] }),
    },

    // ── CERTIFICATIONS ────────────────────────────────────────────────────────
    {
      key: 'certifications', label: 'Certifications', required: false, mode: 'items',
      intro: {
        emoji: '🏅',
        description: "Credentials that back you up. Professional certifications, course completions, awards, competition wins.",
      },
      skipText: "Skip for now",
      addAnotherPrompt: "Add another?",
      itemSteps: [
        {
          heading: "Any certifications or awards?",
          headingAlt: "Add another",
          subtitle: "Professional certifications, course completions, awards, competition wins — anything you've earned.",
          fields: [
            { key: 'thumbnail',     label: 'Badge or certificate image', type: 'file', accept: 'image/*', maxSizeMB: 5,
              hint: "Optional — a badge, certificate, or logo" },
            { key: 'name',          label: 'Name',      type: 'text', required: true, maxLength: 200, placeholder: 'e.g. Google Analytics Certified, Red Dot Award', half: true },
            { key: 'issuer',        label: 'Issued by', type: 'text', required: true, maxLength: 200, placeholder: 'e.g. Google, HubSpot Academy, AIGA', half: true },
            { key: 'dateIssued',    label: 'Issued on',          type: 'text', maxLength: 100, counter: false, placeholder: 'e.g. March 2023',  half: true },
            { key: 'expiryDate',    label: 'Expires on',         type: 'text', maxLength: 100, counter: false, placeholder: 'e.g. March 2026 or leave blank',  half: true },
            { key: 'credentialUrl', label: 'Verification link',  type: 'url',  maxLength: 1000, placeholder: 'https://…',
              hint: "Where someone can verify this credential" },
            { key: 'description',   label: 'Brief note',         type: 'textarea', maxLength: 5000, placeholder: 'What this certification covers or why it matters…' },
            { key: 'tags',          label: 'Related topics',     type: 'tags', placeholder: 'Type a topic and press Enter' },
          ],
        },
      ],
      initItemData: () => ({ name:'', issuer:'', dateIssued:'', expiryDate:'', credentialUrl:'', description:'', tags:[], thumbnail:null }),
      itemTransform: d => ({ id: crypto.randomUUID(), name: d.name||'', issuer: d.issuer||'', dateIssued: d.dateIssued||'', expiryDate: d.expiryDate||'', credentialUrl: d.credentialUrl||'', description: d.description||'', tags: d.tags||[], thumbnail: d.thumbnail || null }),
      sectionConfigFields: [
        { key: 'sectionLabel', label: 'What do you want to call this section?', type: 'text', maxLength: 200, placeholder: 'Certifications & Achievements', half: true },
        { key: 'sectionTitle', label: 'Give it a tagline',                      type: 'text', maxLength: 200, placeholder: 'Credentials and recognition',   half: true },
      ],
      initSectionConfig: (e) => ({ sectionLabel: e?.sectionLabel||'Certifications & Achievements', sectionTitle: e?.sectionTitle||'Credentials and recognition' }),
      sectionWrapper: (items, e, config) => ({ sectionLabel: config?.sectionLabel||e?.sectionLabel||'Certifications & Achievements', sectionTitle: config?.sectionTitle||e?.sectionTitle||'Credentials and recognition', items: [...(e?.items||[]), ...items] }),
    },

    // ── RESEARCH ──────────────────────────────────────────────────────────────
    {
      key: 'research', label: 'Research', required: false, mode: 'items',
      intro: {
        emoji: '📄',
        description: "Published work and thought leadership. Papers, articles, conference talks, case studies — your contributions to a field.",
      },
      skipText: "Skip for now",
      addAnotherPrompt: "Add another publication?",
      itemSteps: [
        {
          heading: "Any published work?",
          headingAlt: "Add another",
          subtitle: "Research papers, articles, conference talks, book chapters — your published contributions.",
          fields: [
            { key: 'title',       label: 'Title',   type: 'text',     required: true, maxLength: 300, placeholder: 'e.g. The Future of Remote Team Collaboration' },
            { key: 'authors',     label: 'Authors', type: 'tags',     placeholder: 'Add a name and press Enter',
              hint: "Add each author — press Enter after every name" },
            { key: 'publishedIn', label: 'Published in', type: 'text', maxLength: 200, placeholder: 'e.g. Harvard Business Review, IEEE, Medium', half: true },
            { key: 'date',        label: 'Year / Date', type: 'text', maxLength: 100, counter: false, placeholder: 'e.g. 2023',          half: true },
            { key: 'url',         label: 'Link to publication', type: 'url',  maxLength: 1000, placeholder: 'https://…',  half: true },
            { key: 'doi',         label: 'DOI',     type: 'text', maxLength: 200, placeholder: 'e.g. 10.1000/xyz123',     half: true },
            { key: 'description', label: 'Summary', type: 'textarea', maxLength: 5000, placeholder: 'What is this about in 2–3 sentences…' },
            { key: 'tags',        label: 'Keywords', type: 'tags', placeholder: 'Type a keyword and press Enter' },
          ],
        },
      ],
      initItemData: () => ({ title:'', authors:[], publishedIn:'', date:'', url:'', doi:'', description:'', tags:[] }),
      itemTransform: d => ({ id: crypto.randomUUID(), title: d.title||'', authors: d.authors||[], publishedIn: d.publishedIn||'', date: d.date||'', url: d.url||'', doi: d.doi||'', description: d.description||'', tags: d.tags||[] }),
      sectionConfigFields: [
        { key: 'sectionLabel', label: 'What do you want to call this section?', type: 'text', maxLength: 200, placeholder: 'Research & Publications',       half: true },
        { key: 'sectionTitle', label: 'Give it a tagline',                      type: 'text', maxLength: 200, placeholder: 'My contributions to the field', half: true },
      ],
      initSectionConfig: (e) => ({ sectionLabel: e?.sectionLabel||'Research & Publications', sectionTitle: e?.sectionTitle||'My contributions to the field' }),
      sectionWrapper: (items, e, config) => ({ sectionLabel: config?.sectionLabel||e?.sectionLabel||'Research & Publications', sectionTitle: config?.sectionTitle||e?.sectionTitle||'My contributions to the field', items: [...(e?.items||[]), ...items] }),
    },

    // ── TESTIMONIALS ──────────────────────────────────────────────────────────
    {
      key: 'testimonials', label: 'Testimonials', required: false, mode: 'items',
      intro: {
        emoji: '💬',
        description: "Let others speak for you. Recommendations from colleagues, managers, clients, or collaborators carry real weight.",
        tip: "Use their exact words — authenticity matters more than polish.",
      },
      skipText: "Skip for now",
      addAnotherPrompt: "Add another recommendation?",
      itemSteps: [
        {
          heading: "What do people say about working with you?",
          headingAlt: "Add another recommendation",
          subtitle: "Recommendations from colleagues, clients, managers, or collaborators — let others vouch for you.",
          fields: [
            { key: 'avatar',      label: 'Their photo',    type: 'avatar' },
            { key: 'name',        label: 'Their name',     type: 'text',     required: true, maxLength: 200, placeholder: 'e.g. Sarah Chen', half: true },
            { key: 'role',        label: 'Their role',     type: 'text',     maxLength: 200, placeholder: 'e.g. Head of Product at Acme', half: true },
            { key: 'company',     label: 'Their company',  type: 'text',     maxLength: 200, placeholder: 'e.g. Acme Corp', half: true },
            { key: 'linkedinUrl', label: 'Their LinkedIn', type: 'url',      maxLength: 1000, placeholder: 'https://linkedin.com/in/…', half: true },
            { key: 'message',     label: 'What they said', type: 'textarea', required: true, maxLength: 5000, placeholder: 'Paste their recommendation or testimonial…',
              hint: "Use their exact words — authenticity matters more than polish" },
          ],
        },
      ],
      initItemData: () => ({ name:'', role:'', company:'', linkedinUrl:'', message:'', avatar:null }),
      itemTransform: d => ({ id: crypto.randomUUID(), name: d.name||'', role: d.role||'', company: d.company||'', linkedinUrl: d.linkedinUrl||'', message: d.message||'', avatar: d.avatar || null }),
      sectionConfigFields: [
        { key: 'sectionLabel', label: 'What do you want to call this section?', type: 'text', maxLength: 200, placeholder: 'Testimonials',             half: true },
        { key: 'sectionTitle', label: 'Give it a tagline',                      type: 'text', maxLength: 200, placeholder: 'What people say about me', half: true },
      ],
      initSectionConfig: (e) => ({ sectionLabel: e?.sectionLabel||'Testimonials', sectionTitle: e?.sectionTitle||'What people say about me' }),
      sectionWrapper: (items, e, config) => ({ sectionLabel: config?.sectionLabel||e?.sectionLabel||'Testimonials', sectionTitle: config?.sectionTitle||e?.sectionTitle||'What people say about me', items: [...(e?.items||[]), ...items] }),
    },

    // ── CONTACT ───────────────────────────────────────────────────────────────
    // Placed before Hero so contact.socials is populated for the social-select.
    {
      key: 'contact', label: 'Contact', required: true, mode: 'steps',
      intro: {
        emoji: '📬',
        description: "How the world reaches you. Your email, phone number, and social profiles — at least one is required.",
      },
      steps: [
        {
          heading: "How can people get in touch?",
          subtitle: "At least one way to reach you — email, phone, or both.",
          validate(f) {
            if (!f.email?.trim() && !f.phone?.trim()) return { _form: 'Provide at least an email or phone number.' }
            return {}
          },
          fields: [
            { key: 'email', label: 'Email', type: 'email', placeholder: 'e.g. hello@yourname.com', half: true,
              hint: "This is how most people will reach out" },
            { key: 'phone', label: 'Phone', type: 'tel',   maxLength: 50, counter: false, placeholder: 'e.g. +1 555 123 4567',  half: true },
          ],
        },
        {
          heading: "Where else can people find you?",
          subtitle: "Social profiles, portfolios, communities — add as many as you like.",
          fields: [
            { key: 'socials', label: 'Your social profiles', type: 'social-pairs' },
          ],
        },
        {
          heading: "Set up your contact section",
          subtitle: "This text appears at the top of your contact section on the portfolio.",
          fields: [
            { key: 'sectionLabel', label: 'What should this section be called?', type: 'text', maxLength: 200, placeholder: 'e.g. Get In Touch', half: true,
              hint: 'The main heading at the top of your contact section' },
            { key: 'heading',      label: "What's your big contact headline?", type: 'text', maxLength: 200, placeholder: "e.g. Let's create something great together.", half: true,
              hint: "A bold statement below the section name — make it inviting" },
            { key: 'tagline',      label: 'One more line below it', type: 'text', maxLength: 500, placeholder: 'e.g. Always happy to chat about new ideas and opportunities.', half: true,
              hint: 'Sets the tone — reassuring, warm, or to the point' },
          ],
        },
      ],
      initData(e) {
        return {
          sectionLabel: e?.sectionLabel || 'Get In Touch',
          heading:      e?.heading      || "Let's build something great together.",
          tagline:      e?.tagline      || "I'm open to new opportunities.",
          email:        e?.email        || user?.email || '',
          phone:        e?.phone        || '',
          socials:      e?.socials      || [],
        }
      },
      transform(f) { return { ...f } },
    },

    // ── FOOTER ────────────────────────────────────────────────────────────────
    {
      key: 'footer', label: 'Footer', required: false, mode: 'steps',
      intro: {
        emoji: '🔗',
        description: "The closing note. A brief sign-off at the bottom of your portfolio. Short and optional.",
      },
      steps: [
        {
          heading: "One last thing — a closing note",
          subtitle: "Optional — a quote, a motto, or a friendly sign-off. 'Built with Dzigned' appears automatically.",
          fields: [
            { key: 'customNote', label: 'Your closing note', type: 'text', maxLength: 500, placeholder: 'e.g. Always building, always learning.' },
          ],
        },
      ],
      initData(e) { return { customNote: e?.customNote || '' } },
      transform(f) { return { ...f } },
    },

    // ── HERO ──────────────────────────────────────────────────────────────────
    // Last — needs CTA options (about/experience/projects/skills) and
    // contact.socials to already be saved.
    {
      key: 'hero', label: 'Hero', required: true, mode: 'steps',
      intro: {
        emoji: '✨',
        description: "The big opening statement. The very first thing every visitor sees — your greeting, headline, and call-to-action buttons.",
        tip: "Fill out Contact and About first so your social links and CTA options are ready here.",
      },
      steps: [
        {
          heading: "Set up your hero section",
          subtitle: "The very first thing visitors see — your opening statement.",
          fields: [
            { key: 'greeting', label: 'Opening line', type: 'text', placeholder: "e.g. Hi, I'm",
              presets: ["Hi, I'm", "Hey there! I'm", "Hello, I'm"],
              hint: "Pick one or write your own — this appears right before your name" },
            { key: '_ctas', label: 'Call-to-action buttons', type: 'cta-group', ctaOptions },
          ],
        },
        {
          heading: "Final touches for your hero",
          fields: [
            { key: 'showProfilePhoto', label: 'Show my photo on the hero section', type: 'toggle' },
            { key: '_heroSocials', label: 'Social links to display on hero', type: 'social-select', options: contactSocials },
          ],
        },
      ],
      initData(e) {
        return {
          greeting:         e?.greeting         || "Hi, I'm",
          _ctas:            { primary: e?.cta?.primary || null, secondary: e?.cta?.secondary || null },
          showProfilePhoto: e?.showProfilePhoto  ?? true,
          _heroSocials:     e?.socials           || [],
        }
      },
      transform(f) {
        return {
          greeting:         f.greeting || "Hi, I'm",
          cta: {
            primary:   f._ctas?.primary?.href   ? f._ctas.primary   : null,
            secondary: f._ctas?.secondary?.href ? f._ctas.secondary : null,
          },
          showProfilePhoto: f.showProfilePhoto ?? true,
          socials:          f._heroSocials || [],
        }
      },
    },
  ]
}
