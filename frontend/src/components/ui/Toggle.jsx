export default function Toggle({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3">
      {(label || description) && (
        <div>
          {label && <p className="text-sm font-medium text-text">{label}</p>}
          {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
        </div>
      )}
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${
          checked ? 'bg-primary' : 'bg-surface-3 border border-bg-border-strong'
        }`}
      >
        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-control-knob shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`} />
      </button>
    </div>
  )
}
