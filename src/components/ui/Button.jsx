import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../utils/cn'

const VARIANTS = {
  primary:
    'bg-primary text-white hover:bg-primary-700 shadow-soft hover:shadow-glow',
  gradient:
    'bg-brand-gradient text-white shadow-soft hover:shadow-glow hover:brightness-105',
  secondary:
    'bg-surface-3 text-ink hover:bg-line',
  outline:
    'border border-line bg-transparent text-ink hover:bg-surface-3',
  ghost: 'bg-transparent text-ink-muted hover:bg-surface-3 hover:text-ink',
  danger: 'bg-danger text-white hover:bg-danger/90 shadow-soft',
  success: 'bg-success text-white hover:bg-success/90 shadow-soft',
  inverse:
    'bg-white text-primary shadow-soft hover:bg-white hover:text-primary-700',
  onBrand:
    'border border-white/45 bg-white/15 text-white shadow-none hover:bg-white/25',
}

const SIZES = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-7 text-base gap-2.5',
  icon: 'h-10 w-10',
}

const Button = forwardRef(function Button(
  {
    children,
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    type = 'button',
    fullWidth = false,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 focus-ring active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
})

export default Button
