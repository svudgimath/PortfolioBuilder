import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'

export default function Select({ label, required, error, value, onChange, options = [], placeholder = 'Select…', className = '' }) {
  const [open, setOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState({})
  const triggerRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      const inTrigger = triggerRef.current?.contains(e.target)
      const inDropdown = dropdownRef.current?.contains(e.target)
      if (!inTrigger && !inDropdown) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 6,
        left: rect.left,
        minWidth: rect.width,
        zIndex: 9999,
      })
    }
    setOpen(v => !v)
  }

  const selected = options.find(o => (o.value ?? o) === value)
  const displayLabel = selected ? (selected.label ?? selected) : placeholder

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-xs font-medium text-text-muted tracking-wide">
          {label}{required && <span className="ml-0.5 text-error">*</span>}
        </label>
      )}
      <div className="relative" ref={triggerRef}>
        <button
          type="button"
          onClick={handleOpen}
          className={`w-full flex items-center justify-between gap-2 input-field px-4 py-2 text-sm text-left transition-all duration-200
            ${error ? 'input-field-error' : ''}
            ${!value ? 'text-text-muted' : 'text-text'}`}
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronDown size={14} className={`shrink-0 text-text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="w-max rounded-xl border border-bg-border bg-bg-surface-light shadow-xl overflow-hidden"
        >
          <div className="max-h-56 overflow-y-auto py-1">
            {options.map(opt => {
              const val = opt.value ?? opt
              const lbl = opt.label ?? opt
              const isSelected = val === value
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => { onChange(val); setOpen(false) }}
                  className={`w-full flex items-center justify-between gap-4 px-4 py-2.5 text-sm text-left transition-colors
                    ${isSelected ? 'text-primary bg-primary/10' : 'text-text-dim hover:bg-surface-3 hover:text-text'}`}
                >
                  <span>{lbl}</span>
                  {isSelected && <Check size={13} className="shrink-0 text-primary" />}
                </button>
              )
            })}
          </div>
        </div>,
        document.body
      )}

      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  )
}
