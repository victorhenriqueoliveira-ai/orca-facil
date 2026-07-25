import React from 'react'

// Utilitário simples de merge de classes (sem dependência externa)
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
}

export function Input({
  label,
  error,
  disabled = false,
  id,
  className,
  ...props
}: InputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            'text-sm font-medium text-text-base',
            disabled && 'opacity-50',
          )}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        disabled={disabled}
        className={cn(
          'w-full rounded-lg border border-border px-3 py-2 text-text-base placeholder:text-text-base/55',
          'focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-1',
          'bg-white',
          error && 'border-error focus:ring-error',
          disabled && 'pointer-events-none cursor-not-allowed opacity-50',
          className,
        )}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error && inputId ? `${inputId}-error` : undefined}
        {...props}
      />
      {error && (
        <span
          id={inputId ? `${inputId}-error` : undefined}
          role="alert"
          className="text-xs text-error"
        >
          {error}
        </span>
      )}
    </div>
  )
}
