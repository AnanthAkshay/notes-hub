import { useState } from 'react'
import { EyeOpenGlyph, EyeClosedGlyph } from '../icons/ArchiveIcons'

export default function PasswordInput({
  id,
  value,
  onChange,
  placeholder = 'Enter secret',
  label,
  required = false,
  autoComplete = 'current-password',
  className = '',
  error = '',
  ...props
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-ink)] mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error && id ? `${id}-error` : undefined}
          className={`w-full bg-[var(--bg-surface)] text-[var(--text-ink)] placeholder:text-[var(--text-subtle)] text-sm rounded-[6px] pl-3.5 pr-11 py-2.5 border transition-colors focus:outline-none focus:bg-[var(--bg-elevated)] ${
            error
              ? 'border-[var(--accent-danger)] focus:border-[var(--accent-danger)]'
              : 'border-[var(--border-hairline)] focus:border-[var(--border-strong)]'
          }`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          aria-label={visible ? 'Hide value' : 'Show value'}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-[4px] text-[var(--text-muted)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
        >
          {visible ? (
            <EyeClosedGlyph className="w-4 h-4" />
          ) : (
            <EyeOpenGlyph className="w-4 h-4" />
          )}
        </button>
      </div>
      {error && (
        <p id={id ? `${id}-error` : undefined} className="mt-1 text-xs text-[var(--accent-danger)] font-medium">
          {error}
        </p>
      )}
    </div>
  )
}

