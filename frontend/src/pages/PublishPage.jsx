import { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Check, AlertTriangle, ExternalLink, Loader2, Rocket,
  ArrowLeft, RefreshCw, PartyPopper,
} from 'lucide-react'

// lucide-react dropped brand icons — GitHub mark inlined as SVG.
function GithubIcon({ size = 18, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"
      className={className} aria-hidden="true">
      <path d="M12 .5C5.37.5 0 5.78 0 12.29c0 5.21 3.44 9.63 8.21 11.19.6.11.82-.25.82-.56 0-.27-.01-1.0-.02-1.96-3.34.71-4.04-1.58-4.04-1.58-.55-1.36-1.34-1.72-1.34-1.72-1.09-.73.08-.72.08-.72 1.2.08 1.84 1.22 1.84 1.22 1.07 1.8 2.81 1.28 3.5.98.11-.76.42-1.28.76-1.57-2.67-.3-5.47-1.31-5.47-5.83 0-1.29.47-2.34 1.23-3.17-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.21a11.6 11.6 0 0 1 6 0c2.29-1.53 3.3-1.21 3.3-1.21.66 1.65.24 2.87.12 3.17.77.83 1.23 1.88 1.23 3.17 0 4.53-2.8 5.53-5.48 5.82.43.36.81 1.08.81 2.18 0 1.58-.01 2.85-.01 3.24 0 .31.22.68.83.56C20.57 21.91 24 17.5 24 12.29 24 5.78 18.63.5 12 .5Z" />
    </svg>
  )
}
import AuthContext from '../auth/AuthContext'
import { getGithubStatus, getGithubConnectUrl } from '../api/github'
import { getPublishStatus, suggestRepoName, validateRepo, publish } from '../api/publish'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  } catch {
    return iso
  }
}

// ── Step rail ─────────────────────────────────────────────────────────────────

function StepCircle({ n, state }) {
  if (state === 'done') {
    return (
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{
          background: 'color-mix(in srgb, var(--color-success) 20%, transparent)',
          color: 'var(--color-success)',
        }}>
        <Check size={16} strokeWidth={2.5} />
      </div>
    )
  }
  if (state === 'current') {
    return (
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold text-white"
        style={{ background: 'var(--color-primary)', boxShadow: 'var(--shadow-glow-xs)' }}>
        {n}
      </div>
    )
  }
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold bg-surface-2 text-text-muted border border-bg-border">
      {n}
    </div>
  )
}

function StepRow({ n, state, isLast, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="flex gap-4"
    >
      <div className="flex flex-col items-center shrink-0">
        <StepCircle n={n} state={state} />
        {!isLast && (
          <div className="w-px flex-1 mt-1.5 mb-1.5 rounded-full"
            style={{ background: 'var(--color-bg-border-strong)', minHeight: '1.5rem' }} />
        )}
      </div>
      <div className={`flex-1 ${isLast ? '' : 'pb-5'}`}>{children}</div>
    </motion.div>
  )
}

function Card({ children, dim }) {
  return (
    <div className={`rounded-xl border border-bg-border bg-bg-surface p-6 transition-opacity ${dim ? 'opacity-60' : ''}`}>
      {children}
    </div>
  )
}

// ── Repo name + validate sub-form ─────────────────────────────────────────────

function RepoNameForm({ repoName, onChange, validation, validating, onValidate }) {
  const tone = !validation ? null
    : validation.ownedByUs ? 'info'
    : validation.available ? 'ok'
    : 'err'

  return (
    <div className="space-y-2.5">
      <div className="flex gap-2">
        <input
          value={repoName}
          onChange={e => onChange(e.target.value)}
          placeholder="my-portfolio"
          spellCheck={false}
          className="flex-1 px-3.5 py-2.5 text-sm text-text input-field"
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onValidate() } }}
        />
        <button
          type="button"
          onClick={onValidate}
          disabled={validating || !repoName.trim()}
          className="px-4 py-2.5 rounded-lg text-sm font-medium border border-bg-border text-text-dim hover:text-text hover:border-bg-border-strong disabled:opacity-40 disabled:pointer-events-none transition-colors shrink-0"
        >
          {validating ? <Loader2 size={15} className="animate-spin" /> : 'Validate'}
        </button>
      </div>
      {validation && (
        <p className="flex items-start gap-1.5 text-sm"
          style={{
            color: tone === 'ok' ? 'var(--color-success)'
              : tone === 'err' ? 'var(--color-error)'
              : 'var(--color-primary)',
          }}>
          <span className="shrink-0 mt-0.5">
            {tone === 'ok' ? <Check size={14} /> : tone === 'err' ? <AlertTriangle size={14} /> : <RefreshCw size={14} />}
          </span>
          {validation.message
            || (tone === 'ok' ? 'Repository name is available'
              : tone === 'info' ? 'This is your currently published repo'
              : 'Repository already exists on your GitHub. Pick a different name.')}
        </p>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PublishPage() {
  const auth = useContext(AuthContext)
  const nav = useNavigate()

  const [loading, setLoading]   = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [github, setGithub]     = useState(null)   // { connected, githubLogin }
  const [githubError, setGithubError] = useState(null) // OAuth error message, if any
  const [connectToast, setConnectToast] = useState(false)

  const [pubStatus, setPubStatus] = useState(null) // publish status

  const [step, setStep] = useState(1)              // furthest revealed step (1-3)

  // Step 2 — repository
  const [repoName, setRepoName]   = useState('')
  const [validation, setValidation] = useState(null)
  const [validating, setValidating] = useState(false)

  // Step 3 — deploy
  const [finalRepoName, setFinalRepoName] = useState('')
  const [mode, setMode] = useState('FULL')
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState(null)
  const [publishResult, setPublishResult] = useState(null)

  const scenario = !pubStatus ? null
    : !pubStatus.published ? 'first'
    : pubStatus.repoExists ? 'republish'
    : 'recreate'

  // ── Load ────────────────────────────────────────────────────────────────────

  async function loadPublishStatus() {
    const ps = await getPublishStatus()
    setPubStatus(ps)
    if (!ps.published) {
      try {
        const { suggestedName } = await suggestRepoName()
        setRepoName(suggestedName || '')
      } catch { /* non-fatal — user can type a name */ }
    } else {
      setRepoName(ps.repoName || '')
    }
  }

  async function init() {
    setLoading(true)
    setLoadError(null)
    try {
      const gs = await getGithubStatus()
      setGithub(gs)
      if (gs.connected) {
        await loadPublishStatus()
        setStep(2)
      } else {
        setStep(1)
      }
    } catch {
      setLoadError('Something went wrong loading this page.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Handle the OAuth round-trip return params, then strip them from the URL.
    const params = new URLSearchParams(window.location.search)
    const gh = params.get('github')
    if (gh) {
      // URLSearchParams already decodes the value (incl. "+" → space)
      const message = params.get('message')
      window.history.replaceState({}, '', window.location.pathname)
      if (gh === 'error') {
        setGithubError(message || "Couldn't connect to GitHub. Please try again.")
      }
      if (gh === 'connected') setConnectToast(true)
    }
    init()
  }, []) // eslint-disable-line

  // Auto-dismiss the "connected" toast
  useEffect(() => {
    if (!connectToast) return
    const t = setTimeout(() => setConnectToast(false), 4000)
    return () => clearTimeout(t)
  }, [connectToast])

  // Warn before leaving mid-publish
  useEffect(() => {
    if (!publishing) return
    const handler = e => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [publishing])

  // ── Actions ─────────────────────────────────────────────────────────────────

  function handleConnect() {
    window.location.href = getGithubConnectUrl(auth.token)
  }

  function handleRepoNameChange(v) {
    setRepoName(v)
    setValidation(null) // any edit invalidates the previous check
  }

  async function handleValidate() {
    if (!repoName.trim()) return
    setValidating(true)
    setValidation(null)
    try {
      const result = await validateRepo(repoName.trim())
      setValidation(result)
    } catch {
      setValidation({ available: false, ownedByUs: false, message: 'Could not check that name. Please try again.' })
    } finally {
      setValidating(false)
    }
  }

  function proceedToStep3({ useCurrent }) {
    if (scenario === 'republish' && useCurrent) {
      setFinalRepoName(pubStatus.repoName)
    } else {
      setFinalRepoName(repoName.trim())
    }
    // First publish / recreate always push everything; re-publish defaults to
    // the faster content-only and lets the user switch.
    setMode(scenario === 'republish' ? 'CONTENT_ONLY' : 'FULL')
    setStep(3)
  }

  async function handlePublish(modeOverride) {
    const m = modeOverride || mode
    setPublishing(true)
    setPublishError(null)
    try {
      const result = await publish(finalRepoName, m)
      setPublishResult(result)
    } catch (e) {
      setPublishError(e.response?.data?.message || 'Publishing failed. Please try again.')
    } finally {
      setPublishing(false)
    }
  }

  // ── Step state for the rail ─────────────────────────────────────────────────

  function stepState(n) {
    const done = n === 1 ? !!github?.connected
      : n === 2 ? step > 2
      : !!publishResult
    if (done) return 'done'
    if (step === n) return 'current'
    return 'todo'
  }

  const validationOk = validation && (validation.available || validation.ownedByUs)

  // ── Loading / fatal error ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 px-6 text-center">
        <AlertTriangle size={28} className="text-error" />
        <p className="text-text-dim">{loadError}</p>
        <button onClick={init} className="btn-fill px-5 py-2.5 rounded-lg text-sm">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* connected toast */}
      {connectToast && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
          style={{
            background: 'color-mix(in srgb, var(--color-success) 16%, var(--color-bg-surface))',
            border: '1px solid color-mix(in srgb, var(--color-success) 35%, transparent)',
            color: 'var(--color-success)',
          }}
        >
          <Check size={15} /> GitHub connected
        </motion.div>
      )}

      <div className="max-w-[700px] mx-auto px-6 py-10">

        {/* Back to editor */}
        <button
          onClick={() => nav('/edit')}
          className="flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text transition-colors mb-6"
        >
          <ArrowLeft size={15} /> Back to editor
        </button>

        {/* Header */}
        <div className="mb-9">
          <h1 className="text-2xl font-bold text-text-primary"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
            Publish your portfolio
          </h1>
          <p className="text-sm text-text-dim mt-1.5">
            Deploy your site to GitHub Pages in three steps.
          </p>
        </div>

        {/* ── Step 1 — Connect GitHub ── */}
        <StepRow n={1} state={stepState(1)} isLast={step < 2}>
          {github?.connected ? (
            <Card>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center shrink-0">
                  <GithubIcon size={18} className="text-text" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text">GitHub connected</p>
                  <p className="text-xs text-text-muted truncate">
                    Signed in as <span className="text-text-dim">@{github.githubLogin}</span>
                  </p>
                </div>
                <Check size={18} className="shrink-0" style={{ color: 'var(--color-success)' }} />
              </div>
            </Card>
          ) : (
            <Card>
              <div className="flex flex-col items-center text-center gap-4 py-2">
                <div className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center">
                  <GithubIcon size={24} className="text-text" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-base font-semibold text-text-primary">
                    Connect your GitHub account
                  </h2>
                  <p className="text-sm text-text-dim max-w-sm">
                    We'll deploy your portfolio to GitHub Pages — free hosting, you own the repo.
                  </p>
                </div>
                {githubError && (
                  <p className="flex items-start gap-1.5 text-sm max-w-sm" style={{ color: 'var(--color-error)' }}>
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    {githubError}
                  </p>
                )}
                <button onClick={handleConnect}
                  className="btn-fill flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm mt-1">
                  <GithubIcon size={16} /> Connect GitHub
                </button>
              </div>
            </Card>
          )}
        </StepRow>

        {/* ── Step 2 — Repository ── */}
        {step >= 2 && (
          <StepRow n={2} state={stepState(2)} isLast={step < 3}>
            <Card dim={step > 2}>
              <h2 className="text-base font-semibold text-text-primary mb-1">
                Repository setup
              </h2>

              {/* First publish */}
              {scenario === 'first' && (
                <>
                  <p className="text-sm text-text-dim mb-4">
                    Pick a name for the repository — it becomes part of your site's URL.
                  </p>
                  <RepoNameForm
                    repoName={repoName} onChange={handleRepoNameChange}
                    validation={validation} validating={validating} onValidate={handleValidate}
                  />
                  <button
                    type="button"
                    onClick={() => proceedToStep3({ useCurrent: false })}
                    disabled={!validationOk || step > 2}
                    className="btn-fill mt-4 px-5 py-2.5 rounded-lg text-sm disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Continue
                  </button>
                </>
              )}

              {/* Already published, repo still exists */}
              {scenario === 'republish' && (
                <>
                  <div className="mt-3 rounded-lg bg-surface-1 border border-bg-border p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-success)' }} />
                      <span className="text-text-dim">Your portfolio is live at</span>
                    </div>
                    <a href={pubStatus.pagesUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline break-all">
                      {pubStatus.pagesUrl} <ExternalLink size={13} className="shrink-0" />
                    </a>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 pt-1 text-xs text-text-muted">
                      <span>Repository: <span className="text-text-dim">{pubStatus.repoName}</span></span>
                      <span>Last published: <span className="text-text-dim">{formatDate(pubStatus.lastPublishedAt)}</span></span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => proceedToStep3({ useCurrent: true })}
                    disabled={step > 2}
                    className="btn-fill mt-4 px-5 py-2.5 rounded-lg text-sm disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Continue
                  </button>
                </>
              )}

              {/* Published but repo was deleted */}
              {scenario === 'recreate' && (
                <>
                  <div className="mt-3 rounded-lg p-4 flex gap-3"
                    style={{
                      background: 'color-mix(in srgb, var(--color-warning) 12%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--color-warning) 30%, transparent)',
                    }}>
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--color-warning)' }} />
                    <div className="text-sm">
                      <p className="text-text font-medium">
                        Your repository "{pubStatus.repoName}" was deleted from GitHub.
                      </p>
                      <p className="text-text-dim mt-0.5">We'll recreate it with the same name and republish everything.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => proceedToStep3({ useCurrent: false })}
                    disabled={step > 2}
                    className="btn-fill mt-4 px-5 py-2.5 rounded-lg text-sm disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Continue
                  </button>
                </>
              )}
            </Card>
          </StepRow>
        )}

        {/* ── Step 3 — Deploy ── */}
        {step >= 3 && (
          <StepRow n={3} state={stepState(3)} isLast>
            <Card>
              {publishResult ? (
                /* ── Success ── */
                <div className="flex flex-col items-center text-center gap-4 py-2">
                  <PartyPopper size={30} style={{ color: 'var(--color-success)' }} />
                  <div className="space-y-1.5">
                    <h2 className="text-lg font-bold text-text-primary"
                      style={{ fontFamily: 'var(--font-display)' }}>
                      Your portfolio is live!
                    </h2>
                    <a href={publishResult.pagesUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 text-sm font-medium text-primary hover:underline break-all">
                      {publishResult.pagesUrl} <ExternalLink size={13} className="shrink-0" />
                    </a>
                    <p className="text-xs text-text-muted">
                      It may take a minute for GitHub Pages to update.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2.5 mt-1">
                    <a href={publishResult.pagesUrl} target="_blank" rel="noopener noreferrer"
                      className="btn-fill flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm">
                      Visit Site <ExternalLink size={14} />
                    </a>
                    <button onClick={() => nav('/dashboard')}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium border border-bg-border text-text-dim hover:text-text hover:border-bg-border-strong transition-colors">
                      <ArrowLeft size={14} /> Back to Dashboard
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Ready to publish ── */
                <>
                  {scenario === 'republish' ? (
                    <>
                      <h2 className="text-base font-semibold text-text-primary mb-1">
                        Push your changes live
                      </h2>
                      <p className="text-sm text-text-dim mb-5">
                        Updating <span className="text-text font-medium">{finalRepoName}</span> with your latest content and styles. Fast — the template stays in place.
                      </p>
                    </>
                  ) : scenario === 'recreate' ? (
                    <>
                      <h2 className="text-base font-semibold text-text-primary mb-1">
                        Ready to recreate your site
                      </h2>
                      <p className="text-sm text-text-dim mb-5">
                        We'll create{' '}
                        <span className="text-text font-medium">{finalRepoName}</span> on your GitHub
                        and push everything fresh.
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="text-base font-semibold text-text-primary mb-1">
                        Ready to go live!
                      </h2>
                      <p className="text-sm text-text-dim mb-5">
                        Your portfolio will be deployed to{' '}
                        <span className="text-text font-medium">
                          {github?.githubLogin}.github.io/{finalRepoName}
                        </span>
                      </p>
                    </>
                  )}

                  {publishError && (
                    <p className="flex items-center gap-1.5 text-sm mb-3" style={{ color: 'var(--color-error)' }}>
                      <AlertTriangle size={14} /> {publishError}
                    </p>
                  )}

                  {publishing ? (
                    <div className="flex items-center gap-2.5 text-sm text-text-dim">
                      <Loader2 size={16} className="animate-spin text-primary" />
                      Publishing your portfolio… this can take up to a minute.
                    </div>
                  ) : scenario === 'republish' ? (
                    <div className="flex flex-col items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handlePublish('CONTENT_ONLY')}
                        className="btn-fill flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm"
                      >
                        <Rocket size={15} /> Publish updates
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePublish('FULL')}
                        className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-dim underline-offset-2 hover:underline transition-colors"
                      >
                        <RefreshCw size={11} /> Site looks broken? Full republish
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handlePublish()}
                      className="btn-fill flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm"
                    >
                      <Rocket size={15} />
                      {scenario === 'recreate' ? 'Recreate site' : 'Publish to GitHub Pages'}
                    </button>
                  )}
                </>
              )}
            </Card>
          </StepRow>
        )}

      </div>
    </div>
  )
}
