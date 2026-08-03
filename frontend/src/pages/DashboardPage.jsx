import { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboard } from '../api/dashboard'
import AuthContext from '../auth/AuthContext'
import { Pencil, Zap, ExternalLink, Check, ArrowRight, Sparkles, FileText } from 'lucide-react'
import ResumeImportModal from '../components/guided/ResumeImportModal'
import UserMenu from '../components/layout/UserMenu'

const ALL_SECTIONS = [
  { key: 'meta',           label: 'Meta'         },
  { key: 'hero',           label: 'Hero'         },
  { key: 'about',          label: 'About'        },
  { key: 'skills',         label: 'Skills'       },
  { key: 'experience',     label: 'Experience'   },
  { key: 'education',      label: 'Education'    },
  { key: 'projects',       label: 'Projects'     },
  { key: 'certifications', label: 'Certs'        },
  { key: 'research',       label: 'Research'     },
  { key: 'testimonials',   label: 'Testimonials' },
  { key: 'contact',        label: 'Contact'      },
  { key: 'footer',         label: 'Footer'       },
]

function timeGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardPage() {
  const { user } = useContext(AuthContext)
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [importOpen, setImportOpen] = useState(false)

  useEffect(() => {
    getDashboard().then(setData).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/40 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) return null

  const { portfolio, publish } = data
  const completed       = portfolio.completedSections
  const completedCount  = completed.length
  const totalCount      = portfolio.totalSections
  const progressPercent = Math.round((completedCount / totalCount) * 100)
  const firstName       = user?.name?.split(' ')[0] || 'there'

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-6 space-y-5">

        {/* ── Identity row ── */}
        <div className="flex items-center justify-between">
          <span
            className="flex items-center gap-2 font-bold text-lg tracking-tight select-none text-text-primary"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <img src="/dzigned_logo.png" alt="" className="w-6 h-6 object-contain" />
            Dzigned
          </span>
          <UserMenu />
        </div>

        {/* ── Hero greeting card ── */}
        <div className="surface-hero-card p-7 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-48 h-48 pointer-events-none rounded-full bg-primary/10 blur-3xl -translate-x-1/3 -translate-y-1/3" />

          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="min-w-0 flex-1">
              <p className="text-text-muted text-xs font-medium mb-1 tracking-widest uppercase">{timeGreeting()}</p>
              <h1
                className="text-3xl font-bold text-text-primary leading-tight mb-2.5"
                style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.025em' }}
              >
                {firstName}
              </h1>
              {publish.published && publish.pagesUrl ? (
                <a
                  href={publish.pagesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={publish.pagesUrl}
                  className="group inline-flex items-center gap-2 max-w-full rounded-full bg-surface-1 border border-bg-border hover:border-primary/40 pl-2.5 pr-3 py-1.5 transition-colors"
                >
                  <span className="relative flex shrink-0">
                    <span className="absolute inline-flex h-2 w-2 rounded-full bg-success opacity-60 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-success shrink-0">Live</span>
                  <span className="w-px h-3 bg-bg-border shrink-0" />
                  <span className="text-xs text-text-dim group-hover:text-primary truncate min-w-0 transition-colors">
                    {publish.pagesUrl.replace(/^https?:\/\//, '')}
                  </span>
                  <ExternalLink size={12} className="shrink-0 text-text-muted group-hover:text-primary transition-colors" />
                </a>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-surface-1 border border-bg-border px-3 py-1.5">
                  <span className="w-2 h-2 rounded-full bg-text-muted/40 shrink-0" />
                  <span className="text-xs text-text-muted">Not published yet</span>
                </span>
              )}
            </div>

            <div className="flex gap-2.5 shrink-0">
              <button
                onClick={() => navigate('/edit')}
                className="btn-fill flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm"
              >
                <Pencil size={13} />
                {completedCount === 0 ? 'Start Building' : 'Open Editor'}
              </button>
              {completedCount > 0 && (
                <button
                  onClick={() => navigate('/publish')}
                  className="btn-ghost flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm"
                >
                  <Zap size={13} />
                  {publish.published ? 'Update Live' : 'Go Live'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Onboarding card (new users) OR stats row (returning users) ── */}
        {completedCount === 0 ? (
          <div className="surface-card p-6">
            <p className="text-sm font-semibold text-text-primary mb-1">Let’s get your portfolio started</p>
            <p className="text-sm text-text-dim leading-relaxed mb-4">
              Already have a resume? We’ll do the heavy lifting and fill it in for you. Or start fresh and build it your way.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {/* Fast path — import from resume */}
              <button
                onClick={() => setImportOpen(true)}
                className="group relative overflow-hidden text-left rounded-xl p-4 border transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: 'linear-gradient(150deg, color-mix(in srgb, var(--color-grad-blue) 16%, var(--color-bg-surface)), color-mix(in srgb, var(--color-grad-purple) 12%, var(--color-bg-surface)))',
                  borderColor: 'color-mix(in srgb, var(--color-primary) 35%, transparent)',
                }}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-9 h-9 rounded-lg gradient-bg flex items-center justify-center shrink-0">
                    <FileText size={16} className="text-white" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ background: 'color-mix(in srgb, var(--color-primary) 20%, transparent)', color: 'var(--color-primary)' }}>
                    Fastest
                  </span>
                </div>
                <p className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                  Import from resume <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </p>
                <p className="text-xs text-text-dim mt-0.5 leading-relaxed">Upload a PDF and we’ll prefill the details.</p>
              </button>

              {/* Manual path — start from scratch */}
              <button
                onClick={() => navigate('/edit')}
                className="group text-left rounded-xl p-4 border border-bg-border bg-surface-2 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25"
              >
                <div className="w-9 h-9 rounded-lg bg-surface-3 flex items-center justify-center shrink-0 mb-2">
                  <Pencil size={15} className="text-text-dim" />
                </div>
                <p className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                  Start from scratch <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </p>
                <p className="text-xs text-text-dim mt-0.5 leading-relaxed">Build it step by step — takes about 5 minutes.</p>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: 'Status',
                value: publish.published ? 'Live' : 'Draft',
                valueClass: publish.published ? 'text-success' : 'text-warning',
              },
              {
                label: 'Last published',
                value: publish.lastPublishedAt
                  ? new Date(publish.lastPublishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : '—',
                valueClass: 'text-text-primary',
              },
              {
                label: 'Completion',
                value: `${progressPercent}%`,
                valueClass: 'text-primary',
              },
            ].map(stat => (
              <div key={stat.label} className="surface-card px-5 py-4">
                <p className="text-text-muted text-xs mb-1.5">{stat.label}</p>
                <p className={`text-xl font-bold ${stat.valueClass}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Canvas sections ── */}
        <div className="surface-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2
                className="text-base font-semibold text-text-primary"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Portfolio sections
              </h2>
              <p className="text-xs text-text-muted mt-0.5">Click any section to jump straight to it in the editor</p>
            </div>
            <span className="text-text-muted text-xs shrink-0 ml-4">{completedCount} / {totalCount} done</span>
          </div>

          <div className="w-full h-1 bg-surface-3 rounded-full mb-5 overflow-hidden">
            <div
              className="h-full rounded-full gradient-bg transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {ALL_SECTIONS.map(section => {
              const isDone = completed.includes(section.key)
              return (
                <button
                  key={section.key}
                  onClick={() => navigate('/edit', { state: { section: section.key } })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 hover:-translate-y-px ${
                    isDone
                      ? 'bg-success/10 border border-success/20 text-success'
                      : 'bg-surface-2 border border-bg-border text-text-muted hover:text-text-dim'
                  }`}
                >
                  {isDone
                    ? <Check size={10} />
                    : <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
                  }
                  {section.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Unpublished changes banner ── */}
        {publish.hasUnpublishedChanges && (
          <div className="flex items-center gap-3 bg-primary/6 border border-primary/16 rounded-xl px-5 py-3.5">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse shrink-0" />
            <p className="text-text-dim text-sm flex-1">Unpublished changes since your last deploy.</p>
            <button
              onClick={() => navigate('/publish')}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:text-accent transition-colors whitespace-nowrap"
            >
              Go Live <ArrowRight size={12} />
            </button>
          </div>
        )}

      </div>

      <ResumeImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onApplied={() => { setImportOpen(false); navigate('/edit') }}
      />
    </div>
  )
}
