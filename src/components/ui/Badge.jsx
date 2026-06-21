import { cn } from '../../utils/cn'

const VARIANTS = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  accent: 'bg-accent/10 text-accent',
  neutral: 'bg-surface-3 text-ink-muted',
}

// Maps domain words → variants so tables/cards stay consistent
const SEMANTIC = {
  Positive: 'success',
  Neutral: 'accent',
  Negative: 'danger',
  Completed: 'success',
  Processing: 'warning',
  Failed: 'danger',
  Advance: 'success',
  Hold: 'warning',
  Reject: 'danger',
}

export default function Badge({ children, variant, dot = false, className }) {
  const resolved = variant || SEMANTIC[children] || 'neutral'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        VARIANTS[resolved],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}
