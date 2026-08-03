import { useState, useEffect, useRef, useContext } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Monitor, Tablet, Smartphone, Eye, EyeOff, ArrowLeft, Zap, Sparkles, FileText } from 'lucide-react'
import { getPortfolio } from '../api/portfolio'
import AuthContext from '../auth/AuthContext'
import PortfolioEditor from '../components/guided/PortfolioEditor'
import ResumeImportModal from '../components/guided/ResumeImportModal'
import StylesPopover from '../components/styles/StylesPopover'
import { SECTION_TO_TAB } from '../utils/sectionDefs'
import { API_BASE_URL } from '../utils/constants'

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS = [
  { key: 'profile',   label: 'Profile',   firstSection: 'meta' },
  { key: 'about',     label: 'About',     firstSection: 'about' },
  { key: 'work',      label: 'Work',      firstSection: 'experience' },
  { key: 'portfolio', label: 'Portfolio', firstSection: 'projects' },
  { key: 'contact',   label: 'Contact',   firstSection: 'contact' },
  { key: 'hero',      label: 'Hero',      firstSection: 'hero' },
]

const TAB_ACCENTS = {
  profile: 'var(--color-cat-profile)', about: 'var(--color-cat-about)', work: 'var(--color-cat-work)',
  portfolio: 'var(--color-cat-portfolio)', contact: 'var(--color-cat-contact)', hero: 'var(--color-cat-hero)',
}

// Which portfolio keys count as "has data" for each tab indicator dot
const TAB_SECTION_KEYS = {
  profile:   ['meta'],
  hero:      ['hero'],
  about:     ['about', 'skills'],
  work:      ['experience', 'education'],
  portfolio: ['projects', 'certifications', 'research', 'testimonials'],
  contact:   ['contact', 'footer'],
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EditPortfolioPage() {
  const location   = useLocation()
  const navigate   = useNavigate()
  const { userId, user } = useContext(AuthContext)

  const initialSection = location.state?.section ?? 'meta'
  const initialTab     = SECTION_TO_TAB[initialSection] ?? 'profile'

  const [activeTab,    setActiveTab]    = useState(initialTab)
  const [sectionKey,   setSectionKey]   = useState(initialSection)
  const [portfolio,    setPortfolio]    = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [showPreview,  setShowPreview]  = useState(true)
  const [previewMode,  setPreviewMode]  = useState('desktop')
  const [previewKey,   setPreviewKey]   = useState(0)
  const [stylesOpen,   setStylesOpen]   = useState(false)
  const [importOpen,   setImportOpen]   = useState(false)
  const [editorKey,    setEditorKey]    = useState(0)
  const previewRef = useRef(null)
  const [previewDims, setPreviewDims]   = useState({ width: 0, height: 0 })

  const DESKTOP_WIDTH  = 1280; const DESKTOP_HEIGHT = 800
  const TABLET_WIDTH   = 768;  const TABLET_HEIGHT  = 1024
  const MOBILE_WIDTH   = 390;  const MOBILE_HEIGHT  = 844

  useEffect(() => {
    getPortfolio().then(setPortfolio).catch(console.error).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const el = previewRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setPreviewDims({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [loading, showPreview])

  function refreshPortfolio() {
    getPortfolio().then(setPortfolio).catch(console.error)
    setPreviewKey(k => k + 1)
  }

  // After a resume import, reload the portfolio AND remount the editor so the
  // newly prefilled sections show up in the form (the editor seeds its form
  // state from the portfolio only on mount / section change).
  function handleImported() {
    setImportOpen(false)
    getPortfolio()
      .then(p => {
        setPortfolio(p)
        setEditorKey(k => k + 1)
        setPreviewKey(k => k + 1)
      })
      .catch(console.error)
  }

  // ── Tab click → jump editor to first section of that tab ──────────────────

  function handleTabChange(tab) {
    setActiveTab(tab.key)
    setSectionKey(tab.firstSection)
  }

  // ── Editor section change → keep tab bar in sync ───────────────────────────

  function handleSectionChange(key) {
    setSectionKey(key)
    const tabKey = SECTION_TO_TAB[key]
    if (tabKey) setActiveTab(tabKey)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const userInitial = user?.name ? user.name[0].toUpperCase() : '?'

  return (
    <div className="h-full flex flex-col">

      {/* ── Toolbar ── */}
      <div
        className="shrink-0 flex items-center gap-3 h-12 px-4 border-b border-bg-border shadow-[0_4px_20px_rgba(0,0,0,0.30)]"
        style={{ background: 'color-mix(in srgb, var(--color-bg) 88%, transparent)', backdropFilter: 'blur(20px)', zIndex: 10 }}
      >
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-text-muted hover:text-text transition-colors duration-150 text-sm shrink-0"
        >
          <ArrowLeft size={14} />
          <span className="hidden sm:inline">Home</span>
        </button>

        <div className="w-px h-4 bg-bg-border shrink-0" />

        {/* Restyle — the magic button, gradient-filled with shimmer */}
        <div className="relative shrink-0">
          <button
            onClick={() => setStylesOpen(o => !o)}
            title="Generate a new look with AI"
            className="relative flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold overflow-hidden transition-all duration-200 select-none"
            style={{
              background: 'linear-gradient(135deg, var(--color-grad-blue) 0%, var(--color-grad-purple) 55%, var(--color-grad-magenta) 100%)',
              color: '#fff',
              boxShadow: stylesOpen
                ? '0 0 0 2px rgba(255,255,255,0.18), 0 4px 24px rgba(110,63,158,0.55)'
                : '0 0 28px rgba(110,63,158,0.45), 0 4px 16px rgba(52,97,224,0.38), inset 0 1px 0 rgba(255,255,255,0.22)',
              transform: stylesOpen ? 'scale(0.96)' : 'scale(1)',
            }}
          >
            <Sparkles size={13} className="shrink-0" />
            <span>Restyle</span>
            {!stylesOpen && <span className="btn-restyle-shimmer" />}
          </button>
          <StylesPopover
            open={stylesOpen}
            onClose={() => setStylesOpen(false)}
            onActiveChanged={() => setPreviewKey(k => k + 1)}
          />
        </div>

        {/* Import from resume */}
        <button
          onClick={() => setImportOpen(true)}
          title="Prefill your portfolio from a resume PDF"
          className="group shrink-0 flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-full text-xs font-semibold text-text-dim hover:text-text bg-surface-2 border border-bg-border hover:border-primary/40 transition-all duration-200 hover:-translate-y-px hover:shadow-[0_0_16px_rgba(110,63,158,0.22)]"
        >
          <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
            style={{ background: 'linear-gradient(135deg, var(--color-grad-blue), var(--color-grad-purple))' }}>
            <FileText size={12} className="text-white" />
          </span>
          <span className="hidden md:inline">Import resume</span>
        </button>

        {/* Tab pills */}
        <div className="flex-1 flex items-center justify-center overflow-x-auto hide-scrollbar">
          <div className="flex items-center gap-0.5 bg-surface-2 rounded-xl p-0.5">
            {TABS.map(tab => {
              const hasData  = (TAB_SECTION_KEYS[tab.key] || []).some(k => !!portfolio?.[k])
              const isActive = activeTab === tab.key
              const accent   = TAB_ACCENTS[tab.key]
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${!isActive ? 'text-text-dim hover:text-text hover:bg-surface-3' : ''}`}
                  style={isActive ? {
                    backgroundColor: `color-mix(in srgb, ${accent} 18%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${accent} 40%, transparent)`,
                    color: accent,
                    boxShadow: `0 0 16px color-mix(in srgb, ${accent} 20%, transparent)`,
                  } : {}}
                >
                  {tab.label}
                  {hasData && (
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? '' : 'bg-success/70'}`}
                      style={isActive ? { backgroundColor: accent } : undefined} />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {showPreview && (
            <div className="flex items-center gap-0.5 bg-surface-2 rounded-lg p-0.5">
              {[
                { mode: 'desktop', Icon: Monitor,    label: 'Desktop' },
                { mode: 'tablet',  Icon: Tablet,     label: 'Tablet'  },
                { mode: 'mobile',  Icon: Smartphone, label: 'Mobile'  },
              ].map(({ mode, Icon, label }) => (
                <button key={mode} onClick={() => setPreviewMode(mode)} title={label}
                  className={`p-1.5 rounded-md transition-all duration-150 ${previewMode === mode ? 'bg-primary/15 text-primary' : 'text-text-muted hover:text-text hover:bg-surface-3'}`}>
                  <Icon size={13} />
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setShowPreview(v => !v)}
            title={showPreview ? 'Hide preview' : 'Show preview'}
            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-3 transition-colors duration-150"
          >
            {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <div className="w-px h-4 bg-bg-border" />
          <button
            onClick={() => navigate('/publish')}
            className="btn-fill flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold"
          >
            <Zap size={12} /> Go Live
          </button>
        </div>
      </div>

      {/* ── Split pane ── */}
      <div className="flex-1 flex gap-4 overflow-hidden p-4">

        {/* Left: always-guided editor */}
        <div className={`${showPreview ? 'w-[42%]' : 'w-full max-w-2xl mx-auto'} flex flex-col overflow-hidden transition-all duration-300`}>
          <div
            data-theme="editor"
            className="flex-1 overflow-hidden rounded-2xl"
            style={{ background: 'var(--color-bg)' }}
          >
            <PortfolioEditor
              key={editorKey}
              portfolio={portfolio}
              user={user}
              sectionKey={sectionKey}
              onSectionChange={handleSectionChange}
              onSaved={refreshPortfolio}
              onNavigatePublish={() => navigate('/publish')}
            />
          </div>
        </div>

        {/* Right: preview — the mat panel hugs the scaled preview exactly */}
        {showPreview && (
          <div ref={previewRef} className="flex-1 flex items-center justify-center overflow-hidden">
            {previewDims.width > 0 && userId && (() => {
              const CHROME_H = 44
              const isMobile = previewMode === 'mobile'
              const isTablet = previewMode === 'tablet'

              const FRAME_W = MOBILE_WIDTH + 24
              const FRAME_H = MOBILE_HEIGHT + 56
              const natW = isMobile ? FRAME_W : isTablet ? TABLET_WIDTH  : DESKTOP_WIDTH
              const natH = isMobile ? FRAME_H : isTablet ? TABLET_HEIGHT : DESKTOP_HEIGHT

              const scale = Math.min(
                1,
                previewDims.width / natW,
                Math.max(0, previewDims.height - CHROME_H) / natH,
              )
              const dispW = natW * scale
              const dispH = natH * scale

              return (
                <div
                  className="surface-preview flex flex-col overflow-hidden"
                  style={{ width: dispW, height: CHROME_H + dispH }}
                >
                  {/* chrome bar */}
                  <div
                    className="shrink-0 flex items-center gap-3 px-4 border-b border-bg-border bg-surface-1"
                    style={{ height: CHROME_H }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-mac-red/60" />
                      <span className="w-3 h-3 rounded-full bg-mac-amber/60" />
                      <span className="w-3 h-3 rounded-full bg-mac-green/60" />
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <span className="text-xs font-medium text-text-muted/70">Live Preview</span>
                    </div>
                    <div className="gradient-bg w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ color: 'var(--color-bg)', fontSize: 9, fontWeight: 700 }}>
                      {userInitial}
                    </div>
                  </div>

                  {/* content — sized exactly to the scaled preview */}
                  <div className="relative overflow-hidden" style={{ width: dispW, height: dispH }}>
                    {isMobile ? (
                      <div style={{
                        position: 'absolute', top: 0, left: 0,
                        width: FRAME_W, height: FRAME_H,
                        transformOrigin: 'top left', transform: `scale(${scale})`,
                      }}>
                        <div style={{ width: FRAME_W, height: FRAME_H }}
                          className="rounded-[2.5rem] border-2 border-bg-border-strong bg-bg overflow-hidden flex flex-col">
                          <div className="shrink-0 h-7 flex items-center justify-center">
                            <div className="w-20 h-4 rounded-full bg-bg-border-strong" />
                          </div>
                          <div className="flex-1 overflow-hidden flex justify-center">
                            <iframe key={previewKey + previewMode} src={`${API_BASE_URL}/preview/${userId}`}
                              title="Portfolio Preview"
                              style={{ width: MOBILE_WIDTH, height: MOBILE_HEIGHT, border: 'none', display: 'block' }} />
                          </div>
                          <div className="shrink-0 h-7 flex items-end justify-center pb-2">
                            <div className="w-24 h-1 rounded-full bg-bg-border-strong" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <iframe
                        key={previewKey + previewMode}
                        src={`${API_BASE_URL}/preview/${userId}`}
                        title="Portfolio Preview"
                        style={{
                          position: 'absolute', top: 0, left: 0,
                          width: natW, height: natH,
                          border: 'none', transformOrigin: 'top left',
                          transform: `scale(${scale})`,
                        }}
                      />
                    )}
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>

      <ResumeImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onApplied={handleImported}
      />
    </div>
  )
}
