export default function Input({ label, required, error, icon, className = "", type = "text", placeholder, ...props }) {
  const unlabeledRequired = !label && required
  const displayPlaceholder = unlabeledRequired && placeholder ? `${placeholder} *` : placeholder
  const padding = icon ? "pl-10 pr-3.5" : "px-3.5"
  const fieldClass = error ? "input-field input-field-error" : "input-field"

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-text-muted tracking-wide">
          {label}{required && <span className="ml-0.5 text-error">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
            {icon}
          </div>
        )}
        <input
          type={type}
          placeholder={displayPlaceholder}
          className={`w-full py-2.5 text-sm text-text placeholder-text-muted/45 ${padding} ${fieldClass} ${className}`}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-error mt-0.5">{error}</span>}
    </div>
  )
}
