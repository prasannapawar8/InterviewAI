import { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '../../utils/cn'

const Input = forwardRef(function Input(
  { label, error, hint, icon: Icon, type = 'text', className, id, ...props },
  ref,
) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword ? (show ? 'text' : 'password') : type
  const inputId = id || props.name

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-subtle" />
        )}
        <input
          ref={ref}
          id={inputId}
          type={inputType}
          className={cn(
            'h-11 w-full rounded-xl border bg-surface-2 text-sm text-ink placeholder:text-ink-subtle transition-all duration-200 focus-ring',
            Icon ? 'pl-11' : 'pl-3.5',
            isPassword ? 'pr-11' : 'pr-3.5',
            error
              ? 'border-danger focus-visible:ring-danger/50'
              : 'border-line hover:border-ink-subtle/50',
            className,
          )}
          aria-invalid={!!error}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-subtle transition-colors hover:text-ink"
            aria-label={show ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </button>
        )}
      </div>
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-ink-subtle">{hint}</p>
      ) : null}
    </div>
  )
})

export default Input
