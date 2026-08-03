export default function Textarea({ label, required, error, rows = 3, className = "", placeholder, ...props }) {
  const unlabeledRequired = !label && required
  const displayPlaceholder = unlabeledRequired && placeholder ? `${placeholder} *` : placeholder
  const fieldClass = error ? "input-field input-field-error" : "input-field"

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-text-muted tracking-wide">{label}{required && <span className="ml-0.5 text-error">*</span>}</label>}
      <textarea
        rows={rows}
        placeholder={displayPlaceholder}
        className={`w-full px-3.5 py-2.5 text-sm text-text placeholder-text-muted/45 resize-none ${fieldClass} ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-error mt-0.5">{error}</span>}
    </div>
  )
}
