export function isSectionEmpty(data, section) {
  if (!data) return true
  switch (section) {
    case 'meta':           return !data.displayName
    case 'hero':           return !data.greeting && !data.cta?.primary && !data.cta?.secondary
    case 'contact':        return !data.email && (!data.socials || data.socials.length === 0)
    case 'about':          return !data.description || data.description.length === 0
    case 'experience':     return !data.items || data.items.length === 0
    case 'projects':       return !data.items || data.items.length === 0
    case 'skills':         return !data.items || data.items.length === 0
    case 'education':      return !data.items || data.items.length === 0
    case 'certifications': return !data.items || data.items.length === 0
    case 'research':       return !data.items || data.items.length === 0
    case 'testimonials':   return !data.items || data.items.length === 0
    case 'footer':         return !data.customNote
    default:               return true
  }
}

// Linear order for auto-navigation after guided section completion
export const GUIDED_ORDER = [
  'meta', 'hero', 'contact', 'about',
  'experience', 'projects', 'skills', 'education',
  'certifications', 'research', 'testimonials', 'footer',
]

export const REQUIRED_SECTIONS = ['meta', 'hero', 'contact']

export const SECTION_TO_TAB_MAP = {
  meta:           'profile',
  hero:           'hero',
  about:          'about',
  skills:         'about',
  experience:     'work',
  education:      'work',
  projects:       'portfolio',
  certifications: 'portfolio',
  research:       'portfolio',
  testimonials:   'contact',
  contact:        'contact',
  footer:         'contact',
}
