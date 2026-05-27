'use client'

import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--foreground-muted)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            h-10 w-full rounded-lg px-3 text-sm
            bg-[var(--surface-raised)] border border-[var(--border)]
            text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]
            focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent
            transition-all duration-150
            ${error ? 'border-[var(--error)] focus:ring-[var(--error)]' : ''}
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-xs text-[var(--error)]">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
