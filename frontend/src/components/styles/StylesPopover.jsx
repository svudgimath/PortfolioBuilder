import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, Check, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { getStyles, getStyleQuota, generateStyle, activateStyle, deleteStyle } from '../../api/styles'

function formatResetsAt(iso) {
  if (!iso) return 'midnight UTC'
  try {
    const d = new Date(iso)
    const now = new Date()
    const hrs = Math.max(0, Math.round((d - now) / 3_600_000))
    return hrs > 0 ? `in ~${hrs}h` : 'shortly'
  } catch { return 'midnight UTC' }
}

// ── Style chip ────────────────────────────────────────────────────────────────

function StyleChip({ style, onActivate, onAskDelete, askingDelete, onConfirmDelete, onCancelDelete, deleting }) {
  const isActive = style.isActive
  const colors   = style?.theme?.colors || {}
  const bg       = colors.bg      || '#1A1730'
  const text     = colors.text    || '#ffffff'
  const a1       = colors.accent1 || '#888888'
  const a2       = colors.accent2 || '#888888'
  const headingFont = style?.typography?.headingFont

  if (askingDelete) {
    return (
      <div
        className="relative w-[72px] h-[56px] rounded-lg overflow-hidden flex flex-col items-center justify-center gap-1 shrink-0"
        style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-bg-border-strong)' }}
      >
        <p className="text-[9px] text-text-dim leading-none">Delete?</p>
        <div className="flex gap-1">
          <button type="button" onClick={onConfirmDelete} disabled={deleting}
            className="w-5 h-5 rounded flex items-center justify-center"
            style={{ background: 'color-mix(in srgb, var(--color-error) 28%, transparent)', color: 'var(--color-error)' }}>
            {deleting ? <Loader2 size={10} className="animate-spin" /> : <Check size={11} />}
          </button>
          <button type="button" onClick={onCancelDelete}
            className="w-5 h-5 rounded bg-surface-3 text-text-dim hover:text-text flex items-center justify-center transition-colors">
            <X size={11} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={isActive ? undefined : onActivate}
      title={`${style.prompt || 'No prompt'}\n${style.generatedAt ? new Date(style.generatedAt).toLocaleString() : ''}`}
      className="group relative w-[72px] h-[56px] rounded-lg overflow-hidden shrink-0 transition-transform hover:-translate-y-0.5"
      style={{
        background: bg,
        outline: isActive ? '2px solid var(--color-primary)' : '1px solid var(--color-bg-border)',
        outlineOffset: isActive ? '1px' : '-1px',
        cursor: isActive ? 'default' : 'pointer',
      }}
    >
      <span
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[14px] font-bold leading-none select-none"
        style={{ color: text, fontFamily: headingFont || 'inherit' }}
      >
        Aa
      </span>

      <span className="absolute bottom-1 right-1 flex gap-0.5">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: a1 }} />
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: a2 }} />
      </span>

      {isActive ? (
        <span
          className="absolute top-1 left-1 w-3.5 h-3.5 rounded-full flex items-center justify-center"
          style={{ background: 'var(--color-primary)', color: '#fff' }}
        >
          <Check size={9} strokeWidth={3} />
        </span>
      ) : (
        <span
          role="button"
          onClick={(e) => { e.stopPropagation(); onAskDelete() }}
          className="absolute top-1 right-1 w-4 h-4 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center bg-bg/80 backdrop-blur-sm hover:bg-error/30 transition-all"
          title="Delete style"
        >
          <Trash2 size={9} className="text-text-dim hover:text-error" />
        </span>
      )}
    </button>
  )
}

// ── Popover ───────────────────────────────────────────────────────────────────

export default function StylesPopover({ open, onClose, onActiveChanged }) {
  const popoverRef = useRef(null)

  const [styles, setStyles]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [prompt, setPrompt]         = useState('')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError]     = useState(null)
  const [quota, setQuota]           = useState(null)

  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deletingId, setDeletingId]           = useState(null)
  const [activatingId, setActivatingId]       = useState(null)

  // Rate-limit disable window
  const [disableUntil, setDisableUntil]   = useState(0)
  const [disableReason, setDisableReason] = useState('')
  const [, setTick] = useState(0) // re-render each second while a countdown is active

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    Promise.all([
      getStyles().catch(() => null),
      getStyleQuota().catch(() => null),
    ]).then(([stylesData, quotaData]) => {
      if (cancelled) return
      if (stylesData) setStyles(Array.isArray(stylesData) ? stylesData : [])
      else setLoadError('Could not load your styles.')
      if (quotaData) applyQuota(quotaData)
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) onClose()
    }
    function handleEsc(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [open, onClose])

  useEffect(() => {
    if (disableUntil <= Date.now()) return
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [disableUntil])

  // ── Actions ────────────────────────────────────────────────────────────────

  // Reflect freshly-fetched quota: if the daily allowance is already spent, prime
  // the disabled state so the user sees it on open (not only after a failed click).
  // Otherwise clear any stale daily lock (e.g. the popover was reopened next day).
  function applyQuota(q) {
    setQuota(q)
    if ((q.remainingToday ?? 1) <= 0) {
      const until = q.resetsAt ? new Date(q.resetsAt).getTime() : Date.now() + 60 * 60_000
      setDisableUntil(until)
      setDisableReason('rate_daily')
      setGenError({ kind: 'daily', message: "You've used all your daily generations. Resets at midnight.", resetsAt: q.resetsAt })
    } else if (disableReason === 'rate_daily') {
      setDisableUntil(0)
      setDisableReason('')
      setGenError(null)
    }
  }

  async function refreshList(activeChanged = false) {
    try {
      const data = await getStyles()
      setStyles(Array.isArray(data) ? data : [])
      if (activeChanged) onActiveChanged?.()
    } catch { /* keep current */ }
  }

  async function handleActivate(style) {
    if (style.isActive || activatingId) return
    setActivatingId(style.id)
    try {
      await activateStyle(style.id)
      await refreshList(true)
    } catch (e) {
      console.error('Activate failed', e)
    } finally {
      setActivatingId(null)
    }
  }

  async function handleDelete(style) {
    setDeletingId(style.id)
    try {
      await deleteStyle(style.id)
      await refreshList(!!style.isActive)
    } catch (e) {
      console.error('Delete failed', e)
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  function handleGenError(err) {
    const res = err?.response
    const data = res?.data
    // Diagnostic — surfaces the true cause (HTTP status, body, axios code) instead
    // of collapsing everything into the generic "Generation failed" message.
    console.error('[restyle] generate failed →',
      'status:', res?.status,
      '| code:', err?.code,
      '| message:', err?.message,
      '| body:', data)
    const headerRetry = parseInt(res?.headers?.['retry-after'], 10)
    const isLLMShape = typeof data?.error === 'string'

    if (isLLMShape) {
      const code = data.error
      if (code === 'rate_limit_minute') {
        const secs = Number.isFinite(headerRetry) ? headerRetry : (data.retryAfter || 30)
        setDisableUntil(Date.now() + secs * 1000)
        setDisableReason('rate_minute')
        setGenError({ kind: 'minute', message: data.message || `Slow down — try again in ${secs}s.` })
      } else if (code === 'rate_limit_daily') {
        const resetsAt = data.resetsAt
        const until = resetsAt ? new Date(resetsAt).getTime() : Date.now() + 60 * 60_000
        setDisableUntil(until)
        setDisableReason('rate_daily')
        setGenError({ kind: 'daily', message: data.message || 'Daily limit reached.', resetsAt })
      } else if (code === 'service_busy') {
        const secs = Number.isFinite(headerRetry) ? headerRetry : (data.retryAfter || 30)
        setDisableUntil(Date.now() + secs * 1000)
        setDisableReason('busy')
        setGenError({ kind: 'busy', message: data.message || `Style service is busy — try again in ${secs}s.` })
      } else if (code === 'service_timeout') {
        setGenError({ kind: 'timeout', message: data.message || 'The model took too long. Try again.' })
      } else if (code === 'generation_failed') {
        setGenError({ kind: 'failed', message: data.message || 'The model returned an unusable result. Try again.' })
      } else {
        setGenError({ kind: 'other', message: data.message || 'Generation failed.' })
      }
    } else if (data?.message) {
      setGenError({ kind: 'standard', message: data.message })
    } else {
      setGenError({ kind: 'unknown', message: 'Generation failed. Please try again.' })
    }
  }

  async function handleGenerate() {
    if (generating || disableUntil > Date.now()) return
    setGenerating(true)
    setGenError(null)
    try {
      const data = await generateStyle({ prompt })
      if (data?.quota) applyQuota(data.quota)  // updates the count and locks if this was the last one
      await refreshList(true)                   // new style is auto-saved + active server-side
      setPrompt('')
    } catch (err) {
      handleGenError(err)
    } finally {
      setGenerating(false)
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const remainingMs  = Math.max(0, disableUntil - Date.now())
  const remainingSec = Math.ceil(remainingMs / 1000)
  const isDisabled   = generating || remainingMs > 0

  let buttonLabel = 'Generate'
  if (generating) buttonLabel = 'Painting your style…'
  else if (remainingMs > 0) {
    buttonLabel = disableReason === 'rate_daily'
      ? `Resets ${formatResetsAt(genError?.resetsAt)}`
      : `Try again in ${remainingSec}s`
  }

  let quotaLine = 'Up to 5 generations per day'
  if (quota) {
    const r = quota.remainingToday ?? 5
    quotaLine = `${r} generation${r === 1 ? '' : 's'} left today · resets midnight UTC`
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        ref={popoverRef}
        initial={{ opacity: 0, y: -6, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.98 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-full left-0 mt-2 z-50 rounded-2xl overflow-hidden"
        style={{
          width: 'min(420px, calc(100vw - 2rem))',
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-bg-border-strong)',
          boxShadow: 'var(--shadow-raise-lg)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-bg-border">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-primary" />
            <p className="text-sm font-semibold text-text-primary">Restyle</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-text hover:bg-surface-3 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Zone A — Your styles */}
        <div className="px-4 pt-4 pb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted mb-2.5">
            Your styles
          </p>
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-text-muted py-2">
              <Loader2 size={13} className="animate-spin" /> Loading…
            </div>
          ) : loadError ? (
            <p className="text-xs text-error py-2">{loadError}</p>
          ) : styles.length === 0 ? (
            <p className="text-xs text-text-muted py-2">No styles yet — generate your first one below.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {styles.map(s => (
                <StyleChip
                  key={s.id}
                  style={s}
                  onActivate={() => handleActivate(s)}
                  onAskDelete={() => setConfirmDeleteId(s.id)}
                  askingDelete={confirmDeleteId === s.id}
                  onConfirmDelete={() => handleDelete(s)}
                  onCancelDelete={() => setConfirmDeleteId(null)}
                  deleting={deletingId === s.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Zone B — Generate */}
        <div className="px-4 pt-3 pb-4 border-t border-bg-border">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted mb-2.5">
            Generate a new style
          </p>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Describe a vibe… e.g. warm editorial serif, muted palette"
            rows={2}
            maxLength={2000}
            disabled={generating}
            className="w-full px-3 py-2 text-sm text-text placeholder-text-muted/55 input-field resize-none"
          />

          {genError && (
            <p className="flex items-start gap-1.5 mt-2 text-xs" style={{ color: 'var(--color-error)' }}>
              <AlertTriangle size={12} className="shrink-0 mt-0.5" /> {genError.message}
            </p>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isDisabled}
            className="btn-fill w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm disabled:opacity-50 disabled:pointer-events-none"
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {buttonLabel}
          </button>

          <p className="text-[11px] text-text-muted mt-2 text-center">{quotaLine}</p>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
