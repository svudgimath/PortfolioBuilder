import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Plus, Trash2, Check, ChevronDown, Pencil, Loader2 } from 'lucide-react'
import { updateSection } from '../../api/portfolio'
import { buildSectionDefs, SECTION_ORDER } from '../../utils/sectionDefs'
import { isSectionEmpty } from '../../utils/sectionUtils'
import Input        from '../ui/Input'
import Textarea     from '../ui/Textarea'
import Toggle       from '../ui/Toggle'
import TagsInput    from '../ui/TagsInput'
import FileUpload   from '../ui/FileUpload'
import AvatarUpload from '../ui/AvatarUpload'

// ── Constants ────────────────────────────────────────────────────────────────

const SOCIAL_PLATFORMS = [
  'GitHub','LinkedIn','Twitter','Instagram','YouTube','Facebook','Discord',
  'Telegram','Dribbble','Behance','Medium','Dev.to','Hashnode',
  'Stack Overflow','LeetCode','HackerRank','Kaggle',
]

const slideVariants = {
  enter:  (dir) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0 },
  exit:   (dir) => ({ opacity: 0, x: dir > 0 ? -30 : 30 }),
}

function getItemSummary(defKey, item) {
  switch (defKey) {
    case 'experience':     return { primary: item.role || 'Untitled role',  secondary: item.company }
    case 'education':      return { primary: item.degree || 'Untitled',     secondary: item.institution }
    case 'projects':       return { primary: item.projectName || 'Untitled project', secondary: null }
    case 'certifications': return { primary: item.name || 'Untitled',       secondary: item.issuer }
    case 'research':       return { primary: item.title || 'Untitled',      secondary: item.publishedIn }
    case 'testimonials':   return { primary: item.name || 'Reviewer',       secondary: item.role }
    default:               return { primary: 'Item', secondary: null }
  }
}

// ── Specialised field renderers ───────────────────────────────────────────────

// Right-aligned "N / max" counter. Turns red within 10% of (or over) the limit.
function CharCounter({ count, max, className = '' }) {
  if (!max) return null
  const near = count >= max * 0.9
  return (
    <span
      className={`self-end text-[10px] tabular-nums leading-none ${className}`}
      style={{ color: near ? 'var(--color-error)' : 'var(--color-text-muted)' }}
    >
      {count} / {max}
    </span>
  )
}

function MultiText({ label, required, value = [], onChange, placeholder, multiline, error, maxLength }) {
  const items = value.length ? value : ['']

  function update(i, v) {
    const next = [...items]; next[i] = v; onChange(next)
  }
  function add() { onChange([...items, '']) }
  function remove(i) { onChange(items.filter((_, idx) => idx !== i)) }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-text-muted tracking-wide">
          {label}{required && <span className="ml-0.5 text-error">*</span>}
        </label>
      )}
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            <div className="flex gap-2 items-start">
              {multiline ? (
                <textarea
                  value={item}
                  onChange={e => update(i, e.target.value)}
                  placeholder={placeholder}
                  rows={2}
                  maxLength={maxLength}
                  className="flex-1 px-3.5 py-2.5 text-sm text-text placeholder-text-muted/45 input-field resize-none"
                />
              ) : (
                <input
                  value={item}
                  onChange={e => update(i, e.target.value)}
                  placeholder={placeholder}
                  maxLength={maxLength}
                  className="flex-1 px-3.5 py-2.5 text-sm text-text placeholder-text-muted/45 input-field"
                />
              )}
              {items.length > 1 && (
                <button type="button" onClick={() => remove(i)} className="mt-1.5 text-text-muted hover:text-error transition-colors shrink-0">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
            {maxLength && <CharCounter count={(item || '').length} max={maxLength} />}
          </div>
        ))}
        <button type="button" onClick={add}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
          <Plus size={12} /> Add paragraph
        </button>
      </div>
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  )
}

function DynamicPairs({ label, value = [], onChange, subfields }) {
  function update(i, key, v) {
    const next = value.map((item, idx) => idx === i ? { ...item, [key]: v } : item)
    onChange(next)
  }
  function add() {
    const blank = Object.fromEntries(subfields.map(sf => [sf.key, '']))
    onChange([...value, blank])
  }
  function remove(i) { onChange(value.filter((_, idx) => idx !== i)) }

  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-text-muted tracking-wide">{label}</label>}
      <div className="space-y-2">
        {value.map((item, i) => (
          <div key={i} className="flex gap-2 items-start rounded-xl bg-surface-1 p-2.5">
            <div className="flex-1 grid grid-cols-2 gap-2">
              {subfields.map(sf => (
                <input key={sf.key}
                  value={item[sf.key] || ''}
                  onChange={e => update(i, sf.key, e.target.value)}
                  placeholder={sf.placeholder}
                  maxLength={sf.maxLength}
                  className={`px-3 py-2.5 text-sm text-text placeholder-text-muted/45 input-field ${sf.half ? '' : 'col-span-2'}`}
                />
              ))}
            </div>
            <button type="button" onClick={() => remove(i)} className="mt-1 text-text-muted hover:text-error transition-colors shrink-0">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        <button type="button" onClick={add}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
          <Plus size={12} /> Add {label?.toLowerCase() || 'item'}
        </button>
      </div>
    </div>
  )
}

function SocialPairsInput({ label, value = [], onChange }) {
  const usedPlatforms = new Set(value.map(v => v.platform))
  const available     = SOCIAL_PLATFORMS.filter(p => !usedPlatforms.has(p))

  // Start on the first platform that isn't already in the list
  const [platform, setPlatform] = useState(
    () => SOCIAL_PLATFORMS.find(p => !usedPlatforms.has(p)) ?? SOCIAL_PLATFORMS[0]
  )
  const [url, setUrl] = useState('')
  const [open, setOpen] = useState(false)

  function add() {
    if (!url.trim()) return
    onChange([...value, { platform, url: url.trim() }])
    setUrl('')
    const used = new Set([...usedPlatforms, platform])
    const next = SOCIAL_PLATFORMS.find(p => !used.has(p))
    if (next) setPlatform(next)
  }

  // Auto-commit when the user clicks away — prevents losing a typed URL on save
  function handleUrlBlur() {
    if (url.trim()) add()
  }

  function remove(i) { onChange(value.filter((_, idx) => idx !== i)) }

  return (
    <div className="flex flex-col gap-3">
      {/* Added profiles list */}
      {value.length > 0 && (
        <div className="space-y-1.5">
          {value.map((p, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-2 border border-bg-border">
              <span className="w-24 shrink-0 text-sm font-medium text-text-dim">{p.platform}</span>
              <span className="flex-1 text-xs text-text-muted truncate font-mono">{p.url}</span>
              <button type="button" onClick={() => remove(i)}
                className="shrink-0 text-text-muted hover:text-error transition-colors">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Platform selector + URL input */}
      <div className="grid grid-cols-[5fr_8fr] gap-2 items-start">
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="w-full flex items-center justify-between gap-1 px-3 py-2 text-sm font-medium text-text-dim input-field rounded-lg"
          >
            <span className="truncate">{platform}</span>
            <ChevronDown size={12} className={`shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <div className="absolute left-0 top-full mt-1 z-50 w-44 rounded-xl border border-bg-border bg-bg-surface-light shadow-2xl overflow-hidden">
              <div className="max-h-52 overflow-y-auto py-1">
                {available.map(p => (
                  <button key={p} type="button" onClick={() => { setPlatform(p); setOpen(false) }}
                    className={`w-full px-3 py-2 text-xs text-left transition-colors ${
                      p === platform ? 'text-primary bg-primary/10' : 'text-text-dim hover:bg-surface-3'
                    }`}>
                    {p}
                  </button>
                ))}
                {available.length === 0 && (
                  <p className="px-3 py-3 text-xs text-text-muted italic">All platforms added</p>
                )}
              </div>
            </div>
          )}
        </div>

        <Input
          type="url"
          placeholder="https://..."
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          onBlur={handleUrlBlur}
        />
      </div>

      {/* Add button — outside the inputs, generic label, proper hover */}
      <button
        type="button"
        onClick={add}
        disabled={!url.trim()}
        className="self-start flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                   bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/25
                   disabled:opacity-30 disabled:pointer-events-none transition-colors"
      >
        <Plus size={13} /> Add profile
      </button>
    </div>
  )
}

function SocialSelect({ label, value = [], onChange, options = [] }) {
  if (!options.length) {
    return (
      <div>
        {label && <label className="text-xs font-medium text-text-muted tracking-wide block mb-1.5">{label}</label>}
        <p className="text-xs text-text-muted py-2">No socials yet — add them in the Contact section first.</p>
      </div>
    )
  }
  function toggle(social) {
    const exists = value.some(s => s.platform === social.platform)
    if (exists) onChange(value.filter(s => s.platform !== social.platform))
    else onChange([...value, { platform: social.platform, url: social.url }])
  }
  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-xs font-medium text-text-muted tracking-wide">{label}</label>}
      <div className="flex flex-wrap gap-2">
        {options.map(social => {
          const selected = value.some(s => s.platform === social.platform)
          return (
            <button key={social.platform} type="button" onClick={() => toggle(social)}
              className={`px-3 py-2.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
                selected ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-surface-2 border-bg-border text-text-dim hover:border-primary/30'
              }`}>
              {social.platform}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CtaGroup({ label, value, onChange, ctaOptions = [] }) {
  const primary   = value?.primary   || null
  const secondary = value?.secondary || null

  function setSlot(slot, cta) { onChange({ ...value, [slot]: cta }) }
  function clearSlot(slot)    { onChange({ ...value, [slot]: null }) }

  return (
    <div className="space-y-2.5">
      {label && <label className="text-xs font-medium text-text-muted tracking-wide block">{label}</label>}
      {(['primary','secondary']).map(slot => {
        const cta     = slot === 'primary' ? primary : secondary
        const other   = slot === 'primary' ? secondary?.href : primary?.href
        const options = ctaOptions.filter(o => o.href !== other)
        return (
          <div key={slot} className="rounded-xl bg-surface-2 border border-bg-border p-3 space-y-2.5">
            <p className="text-xs font-medium text-text-muted capitalize">{slot} button</p>

            {/* Destination picker — always visible */}
            {options.length === 0 ? (
              <p className="text-xs text-text-muted italic">Fill other sections first to see link options.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {options.map(opt => {
                  const selected = cta?.href === opt.href
                  return (
                    <button key={opt.href} type="button"
                      onClick={() => setSlot(slot, { label: selected ? cta.label : opt.label, href: opt.href })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        selected
                          ? 'bg-primary/15 border-primary/40 text-primary'
                          : 'bg-surface-2 border-bg-border text-text-dim hover:bg-primary/10 hover:border-primary/30 hover:text-text'
                      }`}>
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Label editor + remove — only when a destination is chosen */}
            {cta?.href && (
              <div className="flex gap-2 items-center">
                <input
                  value={cta.label || ''}
                  onChange={e => setSlot(slot, { ...cta, label: e.target.value })}
                  placeholder="Button label"
                  className="flex-1 px-3 py-2.5 text-sm text-text input-field"
                />
                <button type="button" onClick={() => clearSlot(slot)}
                  className="text-text-muted hover:text-error transition-colors shrink-0" title="Remove">
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function SkillsBuilder({ formData, onChange }) {
  const categorized = formData._categorized
  const categories  = formData._categories || []
  const flatTags    = formData._flatTags    || []

  function handleToggle(v) {
    if (v) {
      onChange('_categorized', true)
      if (!categories.length) onChange('_categories', [{ id: crypto.randomUUID(), category: '', tags: [] }])
    } else {
      const merged = categories.flatMap(c => c.tags || [])
      onChange('_categorized', false)
      onChange('_flatTags', merged.length ? merged : flatTags)
    }
  }

  function updateCategory(i, key, v) {
    const next = categories.map((c, idx) => idx === i ? { ...c, [key]: v } : c)
    onChange('_categories', next)
  }
  function addCategory() {
    onChange('_categories', [...categories, { id: crypto.randomUUID(), category: '', tags: [] }])
  }
  function removeCategory(i) { onChange('_categories', categories.filter((_, idx) => idx !== i)) }

  return (
    <div className="space-y-4">
      <Toggle label="Group by Category" description="Show skills grouped under category headings"
        checked={!!categorized} onChange={handleToggle} />

      {categorized ? (
        <div className="space-y-2.5">
          {categories.map((cat, i) => (
            <div key={cat.id || i} className="rounded-xl bg-surface-2 border border-bg-border p-3 space-y-2.5">
              <div className="flex items-center gap-2">
                <input value={cat.category} onChange={e => updateCategory(i, 'category', e.target.value)}
                  placeholder="Category (e.g. Design, Tools)" maxLength={100}
                  className="flex-1 px-3 py-2.5 text-sm text-text placeholder-text-muted/45 input-field" />
                <button type="button" onClick={() => removeCategory(i)} className="text-text-muted hover:text-error transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
              <TagsInput label="" value={cat.tags || []} onChange={v => updateCategory(i, 'tags', v)} placeholder="Add skill, press Enter" />
            </div>
          ))}
          <button type="button" onClick={addCategory}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
            <Plus size={12} /> Add category
          </button>
        </div>
      ) : (
        <TagsInput label="Skills" value={flatTags} onChange={v => onChange('_flatTags', v)} placeholder="Add skill, press Enter" />
      )}
    </div>
  )
}

// ── Single field renderer ─────────────────────────────────────────────────────

function renderField(field, formData, setField, errors) {
  const value = formData[field.key]
  const error = errors[field.key]

  // Counter shown for free-text fields only — not URLs (technical), not dates or
  // any field that opts out via counter:false.
  const showCounter = !!field.maxLength
    && field.type !== 'url'
    && field.type !== 'email'
    && field.counter !== false

  switch (field.type) {
    case 'text':
    case 'email':
    case 'tel':
    case 'url':
      return (
        <div key={field.key} className="flex flex-col gap-1.5">
          <Input
            label={field.label}
            type={field.type}
            required={field.required}
            placeholder={field.placeholder}
            value={value || ''}
            onChange={e => setField(field.key, e.target.value)}
            error={error}
            maxLength={field.maxLength}
          />
          {showCounter && <CharCounter count={(value || '').length} max={field.maxLength} />}
          {field.presets?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {field.presets.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setField(field.key, preset)}
                  className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                    value === preset
                      ? 'bg-primary/15 border-primary/40 text-primary'
                      : 'bg-surface-2 border-bg-border text-text-dim hover:border-primary/30 hover:text-text'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          )}
        </div>
      )
    case 'textarea':
      return (
        <div key={field.key} className="flex flex-col gap-1.5">
          <Textarea
            label={field.label}
            required={field.required}
            placeholder={field.placeholder}
            value={value || ''}
            onChange={e => setField(field.key, e.target.value)}
            rows={3}
            error={error}
            maxLength={field.maxLength}
          />
          {showCounter && <CharCounter count={(value || '').length} max={field.maxLength} />}
        </div>
      )
    case 'toggle':
      return (
        <Toggle
          key={field.key}
          label={field.label}
          description={field.description}
          checked={!!value}
          onChange={v => setField(field.key, v)}
        />
      )
    case 'avatar': {
      const name = formData?.displayName || formData?.name || ''
      const initials = name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || null
      return (
        <AvatarUpload
          key={field.key}
          value={value}
          onChange={v => setField(field.key, v)}
          initials={initials}
        />
      )
    }
    case 'file':
      return (
        <FileUpload
          key={field.key}
          label={field.label}
          value={value}
          onChange={v => setField(field.key, v)}
          accept={field.accept}
          maxSizeMB={field.maxSizeMB}
        />
      )
    case 'tags':
      return (
        <TagsInput
          key={field.key}
          label={field.label}
          value={value || []}
          onChange={v => setField(field.key, v)}
          placeholder={field.placeholder}
          maxTagLength={field.maxTagLength}
        />
      )
    case 'multi-text':
      return (
        <MultiText
          key={field.key}
          label={field.label}
          required={field.required}
          value={value || []}
          onChange={v => setField(field.key, v)}
          placeholder={field.placeholder}
          multiline={field.multiline}
          error={error}
          maxLength={field.maxLength}
        />
      )
    case 'social-pairs':
      return (
        <SocialPairsInput
          key={field.key}
          label={field.label}
          value={value || []}
          onChange={v => setField(field.key, v)}
        />
      )
    case 'social-select':
      return (
        <SocialSelect
          key={field.key}
          label={field.label}
          value={value || []}
          onChange={v => setField(field.key, v)}
          options={field.options}
        />
      )
    case 'cta-group':
      return (
        <CtaGroup
          key={field.key}
          label={field.label}
          value={value}
          onChange={v => setField(field.key, v)}
          ctaOptions={field.ctaOptions}
        />
      )
    case 'skills-builder':
      return (
        <SkillsBuilder
          key={field.key}
          formData={formData}
          onChange={setField}
        />
      )
    case 'dynamic-pairs':
      return (
        <DynamicPairs
          key={field.key}
          label={field.label}
          value={value || []}
          onChange={v => setField(field.key, v)}
          subfields={field.subfields}
        />
      )
    default:
      return null
  }
}

// ── Section intro ─────────────────────────────────────────────────────────────

function SectionIntro({ def, onStart, onSkip }) {
  const { intro } = def
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center text-center gap-7 py-6"
    >
      {/* Icon */}
      <div className="w-20 h-20 rounded-3xl section-intro-card flex items-center justify-center text-4xl select-none">
        {intro.emoji}
      </div>

      {/* Copy */}
      <div className="space-y-2.5 max-w-xs px-2">
        <div className="flex items-center justify-center gap-2">
          <h2 className="text-xl font-bold text-text-primary"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
            {def.label}
          </h2>
          {def.required ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'color-mix(in srgb, var(--color-primary) 15%, transparent)', color: 'var(--color-primary)' }}>
              Required
            </span>
          ) : (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
              Optional
            </span>
          )}
        </div>
        <p className="text-sm text-text-dim leading-relaxed">{intro.description}</p>
        {intro.tip && (
          <p className="text-xs text-text-muted leading-relaxed px-3 py-2 rounded-xl"
            style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-bg-border)' }}>
            💡 {intro.tip}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-2.5">
        <button
          type="button"
          onClick={onStart}
          className="btn-fill flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm"
        >
          Get started <ChevronRight size={15} />
        </button>
        {!def.required && (
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-text-muted hover:text-text-dim transition-colors underline-offset-2 hover:underline"
          >
            Skip this section for now
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ── Step content ──────────────────────────────────────────────────────────────

function StepContent({ step, heading, formData, setField, errors, stepIdx, totalSteps }) {
  const displayHeading = heading ?? step.heading
  return (
    <div className="flex flex-col gap-6">
      {/* Heading block */}
      {displayHeading && (
        <div className="flex flex-col gap-2 items-center text-center">
          <h2 className="text-[1.2rem] font-semibold text-text-primary leading-[1.3]"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.015em' }}>
            {displayHeading}
          </h2>
          {step.subtitle && (
            <p className="text-sm text-text-dim leading-relaxed max-w-xs">{step.subtitle}</p>
          )}
          {/* Step progress dots */}
          {totalSteps > 1 && (
            <div className="flex items-center gap-1.5 pt-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i}
                  className="h-1 rounded-full transition-all duration-300"
                  style={{
                    width: i === stepIdx ? 18 : 5,
                    background: i < stepIdx
                      ? 'var(--color-success)'
                      : i === stepIdx
                        ? 'var(--color-primary)'
                        : 'var(--color-bg-border-strong)',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Fields */}
      <div className="grid grid-cols-2 gap-3">
        {step.fields.map(field => {
          const isToggle = field.type === 'toggle'
          const isSkillsBuilder = field.type === 'skills-builder'
          const fieldProps = (isToggle || isSkillsBuilder) ? field : { ...field, label: '' }
          return (
            <div
              key={field.key}
              className={`flex flex-col gap-1.5 rounded-xl p-4 ${field.half ? 'col-span-1' : 'col-span-2'}`}
              style={{
                background: 'linear-gradient(165deg, var(--color-bg-surface), var(--color-bg-shell))',
                boxShadow: 'var(--shadow-raise-md), 0 0 0 1px rgba(255,255,255,0.05)',
              }}
            >
              {field.label && !isToggle && !isSkillsBuilder && (
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <label className="text-[0.82rem] font-medium text-text-dim leading-snug truncate">
                    {field.label}
                  </label>
                  {field.required ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 tracking-wide uppercase"
                      style={{ background: 'color-mix(in srgb, var(--color-primary) 15%, transparent)', color: 'var(--color-primary)' }}>
                      Required
                    </span>
                  ) : (
                    <span className="text-[9px] font-semibold shrink-0 tracking-wide uppercase"
                      style={{ color: 'var(--color-text-muted)', opacity: 0.55 }}>
                      Optional
                    </span>
                  )}
                </div>
              )}
              {field.hint && !isToggle && !isSkillsBuilder && (
                <p className="text-xs text-text-dim leading-relaxed border-l-2 pl-2"
                  style={{ borderColor: 'color-mix(in srgb, var(--color-primary) 30%, transparent)' }}>
                  {field.hint}
                </p>
              )}
              {renderField(fieldProps, formData, setField, errors)}
            </div>
          )
        })}
      </div>

      {errors._form && (
        <p className="text-xs text-error text-center">{errors._form}</p>
      )}
    </div>
  )
}

// ── Items: existing summary screen ────────────────────────────────────────────

function ExistingSummary({ def, portfolio, onAddMore, onContinue, onEdit, onDelete, onSaveSectionConfig }) {
  const items           = portfolio?.[def.key]?.items || []
  const noun            = def.label.toLowerCase()
  const existingSection = portfolio?.[def.key] || {}

  const [labelDraft,  setLabelDraft]  = useState(existingSection.sectionLabel || '')
  const [titleDraft,  setTitleDraft]  = useState(existingSection.sectionTitle || '')
  const [savingCfg,   setSavingCfg]   = useState(false)
  const [cfgDirty,    setCfgDirty]    = useState(false)

  function handleLabelChange(v)  { setLabelDraft(v); setCfgDirty(true) }
  function handleTitleChange(v)  { setTitleDraft(v); setCfgDirty(true) }

  async function handleSaveCfg() {
    setSavingCfg(true)
    await onSaveSectionConfig({ sectionLabel: labelDraft, sectionTitle: titleDraft })
    setCfgDirty(false)
    setSavingCfg(false)
  }

  const cfgFields = def.sectionConfigFields || []

  return (
    <div className="flex flex-col gap-5 py-2">
      <div className="space-y-1 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'color-mix(in srgb, var(--color-primary) 70%, transparent)' }}>
          {def.label}
        </p>
        <h2 className="text-xl font-bold text-text-primary" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.025em' }}>
          {items.length} {items.length === 1 ? noun : noun + 's'} saved
        </h2>
        <p className="text-sm text-text-muted">Edit existing entries or add new ones.</p>
      </div>

      {/* Section heading / tagline inline edit */}
      {cfgFields.length > 0 && (
        <div className="rounded-xl border border-bg-border bg-surface-1 p-3.5 space-y-3">
          <p className="text-xs font-semibold text-text-dim">Customize this section's heading</p>

          {/* Live preview — shows exactly where the values appear */}
          <div className="rounded-lg px-4 py-3 border border-bg-border-strong"
            style={{ background: 'linear-gradient(160deg, var(--color-bg-surface), var(--color-bg-shell))' }}>
            <div className="w-6 h-0.5 rounded-full mb-2" style={{ background: 'var(--color-primary)' }} />
            <p className="text-sm font-bold text-text-primary leading-tight">
              {labelDraft || <span className="text-text-muted/40 font-normal italic">{cfgFields[0]?.placeholder || 'Section heading'}</span>}
            </p>
            {(titleDraft || cfgFields[1]) && (
              <p className="text-xs text-text-muted mt-0.5">
                {titleDraft || <span className="text-text-muted/30 italic">{cfgFields[1]?.placeholder || 'Tagline'}</span>}
              </p>
            )}
            <p className="text-[10px] text-text-muted/40 mt-2 tracking-wide uppercase">Preview · how it appears on your portfolio</p>
          </div>

          <div className="space-y-2">
            <Input
              label="Section heading"
              placeholder={cfgFields[0]?.placeholder || 'e.g. Work Experience'}
              value={labelDraft}
              onChange={e => handleLabelChange(e.target.value)}
            />
            {cfgFields[1] && (
              <Input
                label="Tagline below it (optional)"
                placeholder={cfgFields[1]?.placeholder || 'e.g. My professional journey so far'}
                value={titleDraft}
                onChange={e => handleTitleChange(e.target.value)}
              />
            )}
          </div>

          {cfgDirty && (
            <button
              type="button"
              onClick={handleSaveCfg}
              disabled={savingCfg}
              className="text-xs font-semibold px-3 py-2.5 rounded-lg transition-colors disabled:opacity-50"
              style={{ background: 'color-mix(in srgb, var(--color-primary) 18%, transparent)', color: 'var(--color-primary)' }}
            >
              {savingCfg ? 'Saving…' : 'Save changes'}
            </button>
          )}
        </div>
      )}

      {/* Existing items list */}
      <div className="space-y-1.5">
        {items.map((item, i) => {
          const { primary, secondary } = getItemSummary(def.key, item)
          return (
            <div key={item.id || i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-2 border border-bg-border">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text truncate">{primary}</p>
                {secondary && <p className="text-xs text-text-muted truncate">{secondary}</p>}
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button type="button" onClick={() => onEdit(i)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                  title="Edit">
                  <Pencil size={13} />
                </button>
                <button type="button" onClick={() => onDelete(i)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-error hover:bg-error/10 transition-colors"
                  title="Delete">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-center pt-2">
        <button type="button" onClick={onAddMore}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: 'color-mix(in srgb, var(--color-primary) 18%, transparent)', color: 'var(--color-primary)' }}>
          + Add another
        </button>
        <button type="button" onClick={onContinue}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-text-dim hover:text-text transition-colors"
          style={{ background: 'var(--color-surface-3)' }}>
          Continue →
        </button>
      </div>
    </div>
  )
}

// ── Items: ask-another screen ─────────────────────────────────────────────────

function AskAnother({ def, count, onYes, onNo, saving }) {
  const noun = def.label.toLowerCase()
  const prompt = def.addAnotherPrompt || `Add another ${noun}?`
  return (
    <div className="flex flex-col items-center justify-center gap-7 py-10 text-center">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'color-mix(in srgb, var(--color-primary) 70%, transparent)' }}>
          {count} {count === 1 ? noun : noun + 's'} added
        </p>
        <h2 className="text-2xl font-bold text-text-primary" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.025em' }}>
          {prompt}
        </h2>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onYes}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: 'color-mix(in srgb, var(--color-primary) 18%, transparent)', color: 'var(--color-primary)' }}>
          Yes, add another
        </button>
        <button type="button" onClick={onNo} disabled={saving}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-text-dim hover:text-text disabled:opacity-50 transition-colors"
          style={{ background: 'var(--color-surface-3)' }}>
          {saving ? 'Saving…' : "No, I'm done"}
        </button>
      </div>
    </div>
  )
}

// ── Validation helper ─────────────────────────────────────────────────────────

function validateStep(step, formData) {
  const errors = {}
  for (const field of step.fields) {
    const val = formData[field.key]

    // Length cap — applies to every field (a paste safety net beyond the
    // HTML maxLength attribute), mirroring the backend @Size limits.
    if (field.maxLength) {
      if (field.type === 'multi-text') {
        if ((val || []).some(s => (s || '').length > field.maxLength)) {
          errors[field.key] = `Each entry must be at most ${field.maxLength} characters`
        }
      } else if (typeof val === 'string' && val.length > field.maxLength) {
        errors[field.key] = `Must be at most ${field.maxLength} characters`
      }
    }

    if (!field.required) continue
    if (errors[field.key]) continue
    if (field.type === 'multi-text') {
      const minItems = field.minItems ?? 0
      const filled   = (val || []).filter(Boolean)
      if (filled.length < minItems) errors[field.key] = 'At least one entry is required.'
    } else if (field.type === 'toggle' || field.type === 'file' || field.type === 'avatar' || field.type === 'tags') {
      // never block on these
    } else if (!val || (typeof val === 'string' && !val.trim())) {
      errors[field.key] = 'Required'
    }
  }
  if (step.validate) {
    const extra = step.validate(formData)
    Object.assign(errors, extra)
  }
  return errors
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PortfolioEditor({ portfolio, user, sectionKey, onSectionChange, onSaved, onNavigatePublish }) {
  const sectionDefs = useMemo(() => buildSectionDefs(portfolio, user), [portfolio, user])

  // Navigation state
  const [sectionIdx, setSectionIdx] = useState(0)
  const [stepIdx,    setStepIdx]    = useState(0)
  const [dir,        setDir]        = useState(1) // slide direction

  // Form state (steps mode)
  const [formData, setFormData] = useState({})

  // Items mode state
  const [itemData,     setItemData]     = useState({})
  const [newItems,     setNewItems]     = useState([])
  const [itemPhase,    setItemPhase]    = useState('steps') // 'existing-summary' | 'steps' | 'ask-another'
  const [itemStepIdx,  setItemStepIdx]  = useState(0)
  const [sectionConfig,   setSectionConfig]   = useState({})
  const [editingItemIdx,  setEditingItemIdx]  = useState(null) // null = adding new

  // UI state
  const [errors,        setErrors]        = useState({})
  const [saving,        setSaving]        = useState(false)
  const [dirty,         setDirty]         = useState(false)
  const [introVisible,  setIntroVisible]  = useState(false)
  // Tracks whether autosave has successfully written data for the current section.
  // Without this, after autosave sets dirty=false the portfolio prop is still stale,
  // so isSectionEmpty() returns true and the button flips to "Skip section" incorrectly.
  const [hasSavedOnce, setHasSavedOnce] = useState(false)
  const contentRef = useRef(null)

  // Overall progress
  const doneCount = useMemo(() =>
    SECTION_ORDER.filter(k => !isSectionEmpty(portfolio?.[k], k)).length,
    [portfolio]
  )

  const def = sectionDefs[sectionIdx]

  // ── Autosave (steps mode only) ────────────────────────────────────────────
  // Debounced save while the user types; flushed on section change & unload.
  // Items-mode sections stay explicit — the in-progress item is local state
  // and only commits via "I'm done" / "Save changes".
  const [autosaveStatus, setAutosaveStatus] = useState('idle')  // idle|saving|saved|error
  const autosaveTimerRef = useRef(null)
  const savedTimerRef    = useRef(null)
  const formDataRef = useRef(formData)
  const dirtyRef    = useRef(dirty)
  const defRef      = useRef(def)
  useEffect(() => { formDataRef.current = formData }, [formData])
  useEffect(() => { dirtyRef.current    = dirty    }, [dirty])
  useEffect(() => { defRef.current      = def      }, [def])

  async function autosaveNow() {
    const d  = defRef.current
    const fd = formDataRef.current
    if (!d || d.mode !== 'steps' || !dirtyRef.current) return
    if (autosaveTimerRef.current) { clearTimeout(autosaveTimerRef.current); autosaveTimerRef.current = null }
    setAutosaveStatus('saving')
    try {
      const payload = d.transform ? d.transform(fd) : fd
      await updateSection(d.key, payload)
      dirtyRef.current = false
      setDirty(false)
      setHasSavedOnce(true)
      setAutosaveStatus('saved')
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => {
        setAutosaveStatus(s => (s === 'saved' ? 'idle' : s))
      }, 2000)
    } catch (e) {
      setAutosaveStatus('error')
      console.warn('[autosave]', e?.response?.data?.message || e?.message || e)
    }
  }

  // Debounce save when steps-mode formData changes after a user edit
  useEffect(() => {
    if (!def || def.mode !== 'steps' || !dirty) return
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = setTimeout(() => { autosaveNow() }, 1500)
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
        autosaveTimerRef.current = null
      }
    }
  }, [formData, dirty]) // def captured via ref

  // Best-effort flush + confirm prompt before the tab unloads with unsaved work
  useEffect(() => {
    function handler(e) {
      if (!dirtyRef.current) return
      autosaveNow()
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  // ── Jump to section ─────────────────────────────────────────────────────────

  const goToSection = useCallback((idx, direction = 1) => {
    if (idx < 0 || idx >= sectionDefs.length) return
    // Flush any pending edits in the section we're leaving before switching.
    if (dirtyRef.current && defRef.current?.mode === 'steps') autosaveNow()
    const nextDef = sectionDefs[idx]
    setDir(direction)
    setSectionIdx(idx)
    setStepIdx(0)
    setErrors({})
    setNewItems([])
    setEditingItemIdx(null)
    setDirty(false)
    setHasSavedOnce(false)

    // Show intro for empty sections that have intro metadata
    const isEmpty = isSectionEmpty(portfolio?.[nextDef.key], nextDef.key)
    setIntroVisible(isEmpty && !!nextDef.intro)

    if (nextDef.mode === 'items') {
      const hasExisting = (portfolio?.[nextDef.key]?.items?.length || 0) > 0
      setItemPhase(hasExisting ? 'existing-summary' : 'steps')
      setItemStepIdx(0)
      setItemData(nextDef.initItemData ? nextDef.initItemData() : {})
      setSectionConfig(nextDef.initSectionConfig ? nextDef.initSectionConfig(portfolio?.[nextDef.key]) : {})
    } else {
      const existing = portfolio?.[nextDef.key] ?? null
      setFormData(nextDef.initData ? nextDef.initData(existing) : {})
    }

    onSectionChange?.(nextDef.key)
    contentRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' })
  }, [sectionDefs, portfolio, onSectionChange])

  // Advance to the next section — or finish to the publish page if this is the last
  function advanceSection() {
    if (sectionIdx < sectionDefs.length - 1) {
      goToSection(sectionIdx + 1, 1)
    } else {
      onNavigatePublish?.()
    }
  }

  // ── Sync when external sectionKey prop changes (tab click) ──────────────────

  useEffect(() => {
    if (!sectionKey) return
    const idx = sectionDefs.findIndex(s => s.key === sectionKey)
    if (idx >= 0 && idx !== sectionIdx) {
      goToSection(idx, idx > sectionIdx ? 1 : -1)
    }
  }, [sectionKey]) // intentionally only react to prop change

  // ── Init on mount ───────────────────────────────────────────────────────────

  useEffect(() => {
    goToSection(0, 1)
  }, []) // eslint-disable-line

  // ── Field update helpers ────────────────────────────────────────────────────

  function setField(key, val) {
    setFormData(prev => ({ ...prev, [key]: val }))
    setDirty(true)
    setErrors(prev => { const n = { ...prev }; delete n[key]; delete n._form; return n })
  }

  function setItemField(key, val) {
    setItemData(prev => ({ ...prev, [key]: val }))
    setDirty(true)
    setErrors(prev => { const n = { ...prev }; delete n[key]; delete n._form; return n })
  }

  // ── Steps mode navigation ───────────────────────────────────────────────────

  async function handleNext() {
    const steps      = def.steps || []
    const currentStep = steps[stepIdx]
    const errs = validateStep(currentStep, formData)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})

    if (stepIdx < steps.length - 1) {
      setDir(1); setStepIdx(i => i + 1)
    } else {
      await saveSection()
    }
  }

  function handleBack() {
    if (stepIdx > 0) { setDir(-1); setStepIdx(i => i - 1) }
    else if (sectionIdx > 0) { goToSection(sectionIdx - 1, -1) }
  }

  async function saveSection() {
    setSaving(true)
    // Cancel any pending autosave — this save covers it.
    if (autosaveTimerRef.current) { clearTimeout(autosaveTimerRef.current); autosaveTimerRef.current = null }
    try {
      const payload = def.transform ? def.transform(formData) : formData
      await updateSection(def.key, payload)
      setDirty(false)
      dirtyRef.current = false
      onSaved?.()
      advanceSection()
    } catch (e) {
      setErrors({ _form: e?.response?.data?.message || 'Something went wrong. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  // ── Items mode navigation ───────────────────────────────────────────────────

  function handleItemNext() {
    const steps      = def.itemSteps || []
    const currentStep = steps[itemStepIdx]
    const errs = validateStep(currentStep, itemData)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})

    if (itemStepIdx < steps.length - 1) {
      setDir(1); setItemStepIdx(i => i + 1)
    } else {
      const transformed = def.itemTransform ? def.itemTransform(itemData) : itemData
      if (editingItemIdx !== null) {
        saveEditedItem(transformed)
      } else {
        setNewItems(prev => [...prev, transformed])
        setItemPhase('ask-another')
      }
    }
  }

  function handleItemBack() {
    if (itemStepIdx > 0) { setDir(-1); setItemStepIdx(i => i - 1) }
    else if (editingItemIdx !== null) {
      // Cancel edit → back to summary
      setEditingItemIdx(null)
      setItemPhase('existing-summary')
    }
    else if (sectionIdx > 0) { goToSection(sectionIdx - 1, -1) }
  }

  function handleAddAnother() {
    setItemData(def.initItemData ? def.initItemData() : {})
    setEditingItemIdx(null)
    setItemStepIdx(0)
    setErrors({})
    setDir(1)
    setItemPhase('steps')
  }

  function handleEditItem(idx) {
    const existingItems = portfolio?.[def.key]?.items || []
    const item = existingItems[idx]
    if (!item) return
    setItemData({ ...(def.initItemData ? def.initItemData() : {}), ...item })
    setEditingItemIdx(idx)
    setItemStepIdx(0)
    setErrors({})
    setDir(1)
    setItemPhase('steps')
  }

  async function saveEditedItem(updatedItem) {
    setSaving(true)
    try {
      const existingSection = portfolio?.[def.key] || {}
      const existingItems   = existingSection.items || []
      const updatedItems    = existingItems.map((item, i) =>
        i === editingItemIdx ? { ...item, ...updatedItem } : item
      )
      await updateSection(def.key, { ...existingSection, items: updatedItems })
      onSaved?.()
      setEditingItemIdx(null)
      setItemPhase('existing-summary')
    } catch (e) {
      setErrors({ _form: e?.response?.data?.message || 'Something went wrong. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteItem(idx) {
    const existingSection = portfolio?.[def.key] || {}
    const existingItems   = existingSection.items || []
    const updatedItems    = existingItems.filter((_, i) => i !== idx)
    try {
      await updateSection(def.key, { ...existingSection, items: updatedItems })
      onSaved?.()
    } catch (e) {
      console.error('Delete failed', e)
    }
  }

  async function handleSaveSectionConfig(config) {
    const existingSection = portfolio?.[def.key] || {}
    await updateSection(def.key, { ...existingSection, ...config })
    onSaved?.()
  }

  async function handleItemsDone() {
    setSaving(true)
    try {
      const existing = portfolio?.[def.key] ?? null
      const payload  = def.sectionWrapper ? def.sectionWrapper(newItems, existing, sectionConfig) : { items: newItems }
      await updateSection(def.key, payload)
      onSaved?.()
      advanceSection()
    } catch (e) {
      setErrors({ _form: e?.response?.data?.message || 'Something went wrong. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  // ── Render helpers ───────────────────────────────────────────────────────────

  const isItemsMode = def?.mode === 'items'
  const steps       = isItemsMode ? (def.itemSteps || []) : (def.steps || [])
  const currentStep = isItemsMode ? steps[itemStepIdx] : steps[stepIdx]
  const currentStepIdx = isItemsMode ? itemStepIdx : stepIdx
  const isLastStep    = currentStepIdx === steps.length - 1
  const isFirstStep   = currentStepIdx === 0
  const isLastSection = sectionIdx === sectionDefs.length - 1

  const isSpecialPhase = isItemsMode && (itemPhase === 'existing-summary' || itemPhase === 'ask-another')

  function renderContent() {
    if (!def) return null

    if (introVisible && def.intro) {
      return (
        <SectionIntro
          key={`intro-${sectionIdx}`}
          def={def}
          onStart={() => setIntroVisible(false)}
          onSkip={advanceSection}
        />
      )
    }

    if (isItemsMode && itemPhase === 'existing-summary') {
      return (
        <ExistingSummary
          key="existing-summary"
          def={def}
          portfolio={portfolio}
          onAddMore={handleAddAnother}
          onContinue={advanceSection}
          onEdit={handleEditItem}
          onDelete={handleDeleteItem}
          onSaveSectionConfig={handleSaveSectionConfig}
        />
      )
    }

    if (isItemsMode && itemPhase === 'ask-another') {
      return (
        <AskAnother
          key="ask-another"
          def={def}
          count={newItems.length}
          onYes={handleAddAnother}
          onNo={handleItemsDone}
          saving={saving}
        />
      )
    }

    if (!currentStep) return null

    const effectiveHeading = isItemsMode && newItems.length > 0 && currentStep.headingAlt
      ? currentStep.headingAlt
      : undefined

    // On the very first step of the very first item, prepend section-level config fields
    const showConfigFields = isItemsMode
      && itemStepIdx === 0
      && newItems.length === 0
      && (portfolio?.[def.key]?.items?.length || 0) === 0
      && def.sectionConfigFields?.length > 0

    let effectiveStep    = currentStep
    let effectiveData    = isItemsMode ? itemData : formData
    let effectiveSetField = isItemsMode ? setItemField : setField

    if (showConfigFields) {
      effectiveStep = { ...currentStep, fields: [...def.sectionConfigFields, ...currentStep.fields] }
      effectiveData = { ...sectionConfig, ...itemData }
      const configKeys = new Set(def.sectionConfigFields.map(f => f.key))
      effectiveSetField = (key, val) => {
        if (configKeys.has(key)) {
          setSectionConfig(prev => ({ ...prev, [key]: val }))
          setErrors(prev => { const n = { ...prev }; delete n[key]; delete n._form; return n })
        } else {
          setItemField(key, val)
        }
      }
    }

    return (
      <StepContent
        key={`${sectionIdx}-${currentStepIdx}`}
        step={effectiveStep}
        heading={effectiveHeading}
        formData={effectiveData}
        setField={effectiveSetField}
        errors={errors}
        stepIdx={currentStepIdx}
        totalSteps={steps.length}
      />
    )
  }

  if (!def) return null

  // Optional section, untouched, still empty → the primary button skips it.
  const isSkippable = !def.required
    && !dirty
    && !hasSavedOnce
    && !isSpecialPhase
    && !introVisible
    && editingItemIdx === null
    && (!isItemsMode || newItems.length === 0)
    && isSectionEmpty(portfolio?.[def.key], def.key)

  const primaryLabel = saving
    ? 'Saving…'
    : isSkippable
      ? (isLastSection ? 'Skip & finish' : 'Skip section')
      : isLastStep
        ? (editingItemIdx !== null
            ? 'Save changes'
            : isLastSection ? 'Save & Finish' : 'Save & Continue')
        : 'Next'

  const progressPct = Math.round((doneCount / SECTION_ORDER.length) * 100)

  return (
    <div className="h-full flex flex-col">

      {/* ── Overall progress bar ── */}
      <div className="shrink-0 px-6 pt-5 pb-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-text-dim tracking-wide"
            style={{ fontFamily: 'var(--font-display)' }}>
            {def.label}
            {!def.required && (
              <span className="ml-1.5 text-[9px] font-semibold tracking-wider uppercase"
                style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>
                optional
              </span>
            )}
          </span>
          <span className="text-[10px] text-text-muted tabular-nums">{doneCount} / {SECTION_ORDER.length} sections done</span>
        </div>
        <div className="w-full h-0.5 rounded-full overflow-hidden"
          style={{ background: 'var(--color-surface-2)' }}>
          <div
            className="h-full rounded-full gradient-bg transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* ── Step content ── */}
      <div ref={contentRef} className="flex-1 overflow-y-auto px-6 py-6">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={`${sectionIdx}-${isItemsMode ? itemPhase + itemStepIdx : stepIdx}`}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Step navigation ── */}
      {!isSpecialPhase && !introVisible && (
        <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3">
          <button
            type="button"
            onClick={isItemsMode ? handleItemBack : handleBack}
            disabled={isFirstStep && sectionIdx === 0}
            className="flex items-center gap-1 text-sm font-medium text-text-muted hover:text-text disabled:opacity-20 transition-colors shrink-0"
          >
            <ChevronLeft size={15} /> Back
          </button>

          {/* Centred slot: form-error OR autosave status */}
          <div className="flex-1 flex items-center justify-center text-xs px-2 min-w-0">
            {errors._form ? (
              <span className="truncate" style={{ color: 'var(--color-error)' }}>{errors._form}</span>
            ) : def?.mode === 'steps' ? (
              autosaveStatus === 'saving' ? (
                <span className="flex items-center gap-1.5 text-text-muted">
                  <Loader2 size={11} className="animate-spin" /> Saving…
                </span>
              ) : autosaveStatus === 'saved' ? (
                <span className="flex items-center gap-1.5 text-text-muted">
                  <Check size={11} style={{ color: 'var(--color-success)' }} /> Saved
                </span>
              ) : autosaveStatus === 'error' ? (
                <span className="flex items-center gap-1.5" style={{ color: 'var(--color-error)' }}>
                  Couldn't save ·
                  <button type="button" onClick={() => autosaveNow()} className="underline hover:no-underline">
                    retry
                  </button>
                </span>
              ) : null
            ) : null}
          </div>

          {isSkippable ? (
            <button
              type="button"
              onClick={advanceSection}
              className="flex items-center gap-1 text-sm font-medium text-text-dim hover:text-text border border-bg-border hover:border-bg-border-strong px-4 py-2 rounded-lg transition-colors shrink-0"
            >
              {primaryLabel} <ChevronRight size={15} />
            </button>
          ) : (
            <button
              type="button"
              onClick={isItemsMode ? handleItemNext : handleNext}
              disabled={saving}
              className="btn-fill flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm shrink-0"
            >
              {primaryLabel} {!saving && <ChevronRight size={15} />}
            </button>
          )}
        </div>
      )}

    </div>
  )
}
