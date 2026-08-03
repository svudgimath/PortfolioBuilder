import { useState } from 'react'
import { X, Plus } from 'lucide-react'

export default function TagsInput({ label, description, value = [], onChange, placeholder = "Type and press Enter or + Add", maxTagLength = 100 }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const trimmed = input.trim()

  const add = () => {
    if (!trimmed) { setInput(''); return }
    if (maxTagLength && trimmed.length > maxTagLength) {
      setError(`Each entry must be at most ${maxTagLength} characters`)
      return
    }
    if (!value.includes(trimmed)) onChange([...value, trimmed])
    setInput('')
    setError('')
  }

  const remove = (t) => onChange(value.filter(v => v !== t))

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <div className="flex items-baseline gap-2">
          <label className="text-xs font-medium text-text-muted tracking-wide">{label}</label>
          {description && <span className="text-xs text-text-muted">{description}</span>}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-1.5 px-2 py-1.5 min-h-9.5 input-field">
          <input
            value={input}
            onChange={e => { setInput(e.target.value); if (error) setError('') }}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }}
            onBlur={add}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-text text-sm outline-none placeholder-text-muted/45 min-w-0"
          />
          {/* Subtle kbd hint — fades in while typing */}
          {trimmed && (
            <kbd className="shrink-0 px-1.5 py-0.5 rounded border border-bg-border bg-surface-2 text-[10px] font-mono text-text-muted/60 leading-tight select-none pointer-events-none">
              ↵
            </kbd>
          )}
        </div>

        {/* + Add button — only visible when there's text */}
        <button
          type="button"
          onClick={add}
          disabled={!trimmed}
          className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-all duration-150"
          style={trimmed ? {
            background: 'color-mix(in srgb, var(--color-primary) 14%, transparent)',
            borderColor: 'color-mix(in srgb, var(--color-primary) 35%, transparent)',
            color: 'var(--color-primary)',
          } : {
            background: 'var(--color-surface-2)',
            borderColor: 'var(--color-bg-border)',
            color: 'var(--color-text-muted)',
            opacity: 0.4,
          }}
        >
          <Plus size={11} />
          Add
        </button>
      </div>

      {error && <span className="text-xs text-error">{error}</span>}

      {/* Tag pills */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {value.map(t => (
            <span key={t} className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/15 border border-primary/25 text-primary text-xs">
              {t}
              <button type="button" onClick={() => remove(t)} className="text-primary/60 hover:text-primary leading-none">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
