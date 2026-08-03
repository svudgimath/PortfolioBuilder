import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Upload, FileText, Loader2, Check, AlertTriangle, Sparkles, ArrowRight } from 'lucide-react'
import { parseResume, applyResume, getPortfolio } from '../../api/portfolio'
import { isSectionEmpty } from '../../utils/sectionUtils'

// Sections the resume parser can return, in display order, with their identity.
const SECTION_INFO = {
  meta:           { emoji: '👋', label: 'Profile' },
  hero:           { emoji: '✨', label: 'Hero' },
  about:          { emoji: '📖', label: 'About' },
  skills:         { emoji: '⚡', label: 'Skills' },
  experience:     { emoji: '💼', label: 'Experience' },
  education:      { emoji: '🎓', label: 'Education' },
  projects:       { emoji: '🗂️', label: 'Projects' },
  certifications: { emoji: '🏅', label: 'Certifications' },
  research:       { emoji: '📄', label: 'Research' },
  contact:        { emoji: '📬', label: 'Contact' },
  footer:         { emoji: '🔗', label: 'Footer' },
}
const SECTION_ORDER = ['meta', 'hero', 'about', 'skills', 'experience', 'education', 'projects', 'certifications', 'research', 'contact', 'footer']

// One-line human summary of what was extracted for a section.
function summarize(key, data) {
  if (!data) return ''
  const count = (data.items || []).length
  switch (key) {
    case 'meta':           return [data.displayName, data.title].filter(Boolean).join(' · ') || 'Your profile basics'
    case 'hero':           return data.greeting ? `“${data.greeting}…”` : 'Your opening statement'
    case 'about': {
      const n = (data.description || []).length
      return n ? `${n} paragraph${n > 1 ? 's' : ''} about you` : 'A short bio'
    }
    case 'skills': {
      const tags = (data.items || []).reduce((s, g) => s + (g.tags?.length || 0), 0)
      return tags ? `${tags} skill${tags > 1 ? 's' : ''} found` : 'Your skills'
    }
    case 'experience':     return `${count} role${count !== 1 ? 's' : ''}`
    case 'education':       return `${count} qualification${count !== 1 ? 's' : ''}`
    case 'projects':        return `${count} project${count !== 1 ? 's' : ''}`
    case 'certifications':  return `${count} certification${count !== 1 ? 's' : ''}`
    case 'research':        return `${count} publication${count !== 1 ? 's' : ''}`
    case 'contact':         return [data.email, data.phone].filter(Boolean).join(' · ') || 'How to reach you'
    case 'footer':          return data.customNote || 'A closing note'
    default:                return 'Detected'
  }
}

const MAX_MB = 10

// Rotating reassurance while the model reads the resume.
const PARSING_MESSAGES = [
  'Reading your resume…',
  'Pulling out your experience…',
  'Spotting your skills…',
  'Tidying everything up…',
]

export default function ResumeImportModal({ open, onClose, onApplied }) {
  const [phase, setPhase]       = useState('upload')   // upload | parsing | review | applying
  const [result, setResult]     = useState(null)
  const [existing, setExisting] = useState(null)       // current portfolio, for non-destructive merge
  const [accepted, setAccepted] = useState(() => new Set())
  const [error, setError]       = useState(null)
  const [fileName, setFileName] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [msgIdx, setMsgIdx]     = useState(0)
  const inputRef = useRef(null)

  // Reset everything whenever the modal opens fresh, and load the current
  // portfolio so we can merge non-destructively (and flag sections already filled).
  useEffect(() => {
    if (open) {
      setPhase('upload'); setResult(null); setAccepted(new Set())
      setError(null); setFileName(''); setDragOver(false); setMsgIdx(0)
      setExisting(null)
      getPortfolio().then(setExisting).catch(() => setExisting(null))
    }
  }, [open])

  // Cycle parsing messages.
  useEffect(() => {
    if (phase !== 'parsing') return
    const id = setInterval(() => setMsgIdx(i => (i + 1) % PARSING_MESSAGES.length), 2200)
    return () => clearInterval(id)
  }, [phase])

  // Esc to close (except mid-flight).
  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape' && phase !== 'parsing' && phase !== 'applying') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, phase, onClose])

  async function handleFile(file) {
    if (!file) return
    setError(null)
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) { setError('Please upload a PDF file.'); return }
    if (file.size > MAX_MB * 1024 * 1024) { setError(`That file is over ${MAX_MB}MB. Try a smaller export.`); return }

    setFileName(file.name)
    setPhase('parsing')
    try {
      const data = await parseResume(file)
      const found = SECTION_ORDER.filter(k => data[k] != null)
      if (found.length === 0) {
        setError("We couldn't pull any details from this resume. Try a different file, or fill things in yourself.")
        setPhase('upload')
        return
      }
      setResult(data)
      setAccepted(new Set(found))   // everything on by default
      setPhase('review')
    } catch (e) {
      const status = e?.response?.status
      const msg = e?.response?.data?.message
      if (e?.code === 'ECONNABORTED' || status === 504) {
        setError('That took too long to read. Give it another try.')
      } else if (status === 429) {
        // Provider rate limit / quota exhausted — backend sends a clear message.
        setError(msg || "We've hit our AI limit for now. Please try again in a little while.")
      } else if (status === 503) {
        setError(msg || 'Resume parsing is busy right now. Try again in a moment.')
      } else if (status === 400) {
        setError(msg || "This PDF looks like a scanned image — we can't read text from it. Try a text-based PDF export.")
      } else {
        setError(msg || 'Something went wrong reading your resume. Please try again.')
      }
      setPhase('upload')
    }
  }

  function toggle(key) {
    setAccepted(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  async function handleApply() {
    if (accepted.size === 0) return
    setPhase('applying')
    setError(null)
    try {
      // Send only the accepted sections. Each fully replaces what the user has
      // in that section — a clean overwrite from the resume.
      const selection = {}
      for (const key of accepted) selection[key] = result[key]
      await applyResume(selection)
      onApplied?.()
    } catch (e) {
      setError(e?.response?.data?.message || "We couldn't apply these details. Please try again.")
      setPhase('review')
    }
  }

  if (!open) return null

  const foundKeys = result ? SECTION_ORDER.filter(k => result[k] != null) : []

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        style={{ background: 'rgba(8,6,16,0.66)', backdropFilter: 'blur(4px)' }}
        onMouseDown={(e) => { if (e.target === e.currentTarget && phase !== 'parsing' && phase !== 'applying') onClose() }}
      >
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.98 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col max-h-[88vh]"
          style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-bg-border-strong)', boxShadow: 'var(--shadow-raise-lg)' }}
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3.5 border-b border-bg-border">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-primary" />
              <p className="text-sm font-semibold text-text-primary">Import from resume</p>
            </div>
            {phase !== 'parsing' && phase !== 'applying' && (
              <button type="button" onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-text hover:bg-surface-3 transition-colors">
                <X size={14} />
              </button>
            )}
          </div>

          {/* ── Upload ── */}
          {phase === 'upload' && (
            <div className="p-5 flex flex-col gap-4">
              <p className="text-sm text-text-dim leading-relaxed">
                Skip the typing. Drop in your resume and we’ll fill out your portfolio for you — you can tweak everything after. ✨
              </p>
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
                className={`w-full rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-2.5 py-9 px-4 transition-colors ${
                  dragOver ? 'border-primary/55 bg-primary/5' : 'border-bg-border hover:border-primary/35 hover:bg-surface-1/40'
                }`}
              >
                <div className="w-11 h-11 rounded-xl gradient-bg flex items-center justify-center">
                  <Upload size={18} className="text-white" />
                </div>
                <p className="text-sm font-medium text-text-primary">Click or drag your resume here</p>
                <p className="text-xs text-text-muted">PDF · text-based · max {MAX_MB}MB</p>
              </div>
              {error && (
                <p className="flex items-start gap-1.5 text-xs" style={{ color: 'var(--color-error)' }}>
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {error}
                </p>
              )}
              <input ref={inputRef} type="file" accept=".pdf,application/pdf" className="hidden"
                onChange={(e) => handleFile(e.target.files[0])} />
            </div>
          )}

          {/* ── Parsing ── */}
          {phase === 'parsing' && (
            <div className="p-9 flex flex-col items-center text-center gap-4">
              <div className="relative w-14 h-14 flex items-center justify-center">
                <span className="absolute inset-0 rounded-full bg-primary/15 animate-ping" />
                <div className="relative w-12 h-12 rounded-full gradient-bg flex items-center justify-center">
                  <FileText size={20} className="text-white" />
                </div>
              </div>
              <div>
                <AnimatePresence mode="wait">
                  <motion.p key={msgIdx}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.25 }}
                    className="text-sm font-medium text-text-primary">
                    {PARSING_MESSAGES[msgIdx]}
                  </motion.p>
                </AnimatePresence>
                {fileName && <p className="text-xs text-text-muted mt-1 truncate max-w-[16rem]">{fileName}</p>}
              </div>
            </div>
          )}

          {/* ── Review ── */}
          {phase === 'review' && (
            <>
              <div className="shrink-0 px-5 pt-4 pb-3">
                <p className="text-sm font-semibold text-text-primary">Here’s what we found 🎉</p>
                <p className="text-xs text-text-dim mt-0.5">Pick what to keep — uncheck anything you’d rather skip.</p>
              </div>
              <div className="flex-1 overflow-y-auto px-5 pb-2 space-y-2">
                {foundKeys.map(key => {
                  const info = SECTION_INFO[key]
                  const on = accepted.has(key)
                  const willReplace = existing && !isSectionEmpty(existing[key], key)
                  return (
                    <button key={key} type="button" onClick={() => toggle(key)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all duration-150"
                      style={{
                        background: on ? 'color-mix(in srgb, var(--color-primary) 8%, var(--color-bg-surface))' : 'var(--color-surface-2)',
                        borderColor: on ? 'color-mix(in srgb, var(--color-primary) 35%, transparent)' : 'var(--color-bg-border)',
                      }}>
                      <span className="text-lg shrink-0 leading-none">{info.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-text-primary">{info.label}</p>
                          {willReplace && (
                            <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
                              style={{ background: 'color-mix(in srgb, var(--color-warning) 18%, transparent)', color: 'var(--color-warning)' }}>
                              Replaces yours
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-muted truncate">
                          {willReplace ? 'Will replace what you have here' : summarize(key, result[key])}
                        </p>
                      </div>
                      <span className="shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-colors"
                        style={{
                          background: on ? 'var(--color-primary)' : 'transparent',
                          border: on ? 'none' : '1.5px solid var(--color-bg-border-strong)',
                        }}>
                        {on && <Check size={13} strokeWidth={3} className="text-white" />}
                      </span>
                    </button>
                  )
                })}
              </div>
              <div className="shrink-0 px-5 py-4 border-t border-bg-border">
                {error && (
                  <p className="flex items-start gap-1.5 text-xs mb-2.5" style={{ color: 'var(--color-error)' }}>
                    <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {error}
                  </p>
                )}
                <button type="button" onClick={handleApply} disabled={accepted.size === 0}
                  className="btn-fill w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm disabled:opacity-50 disabled:pointer-events-none">
                  {accepted.size === 0 ? 'Select at least one' : `Add ${accepted.size} section${accepted.size > 1 ? 's' : ''} to my portfolio`}
                  {accepted.size > 0 && <ArrowRight size={14} />}
                </button>
                <p className="text-[11px] text-text-muted mt-2 text-center">You can edit everything afterwards.</p>
              </div>
            </>
          )}

          {/* ── Applying ── */}
          {phase === 'applying' && (
            <div className="p-9 flex flex-col items-center text-center gap-3">
              <Loader2 size={26} className="text-primary animate-spin" />
              <p className="text-sm font-medium text-text-primary">Adding it to your portfolio…</p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
