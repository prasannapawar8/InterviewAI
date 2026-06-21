import { cn } from '../../utils/cn'

export function Card({ className, children, hover = false, ...props }) {
  return (
    <div
      className={cn(
        'card p-6',
        hover && 'transition-all duration-300 hover:-translate-y-1 hover:shadow-card',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={cn('mb-5 flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export default Card
