import { getIcon } from '../../utils/icons'
import { cn } from '../../utils/cn'

const STATUS = {
  good: 'text-success',
  warn: 'text-warning',
  bad: 'text-danger',
}

export default function MetricTile({ metric }) {
  const Icon = getIcon(metric.icon)
  return (
    <div className="rounded-xl border border-line bg-surface-2 p-4">
      <div className="flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <span className={cn('h-2 w-2 rounded-full', STATUS[metric.status] || 'text-ink-subtle')}>
          <span className={cn('block h-2 w-2 rounded-full bg-current')} />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold text-ink">
        {metric.value}
        <span className="ml-1 text-sm font-medium text-ink-subtle">{metric.unit}</span>
      </p>
      <p className="mt-0.5 text-sm font-medium text-ink-muted">{metric.label}</p>
      <p className="mt-1 text-xs text-ink-subtle">Target: {metric.target}</p>
    </div>
  )
}
