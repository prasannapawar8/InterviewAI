import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { getIcon } from '../../utils/icons'
import { cn } from '../../utils/cn'

const ACCENTS = {
  primary: 'bg-primary/10 text-primary',
  accent: 'bg-accent/10 text-accent',
  success: 'bg-success/10 text-success',
  secondary: 'bg-secondary/10 text-secondary',
  warning: 'bg-warning/10 text-warning',
}

export default function StatCard({ stat, index = 0 }) {
  const Icon = getIcon(stat.icon)
  const up = stat.trend === 'up'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-card"
    >
      <div className="flex items-start justify-between">
        <div className={cn('grid h-11 w-11 place-items-center rounded-xl', ACCENTS[stat.accent])}>
          <Icon className="h-5 w-5" />
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold',
            up ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger',
          )}
        >
          {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {Math.abs(stat.delta)}%
        </span>
      </div>
      <p className="mt-5 text-3xl font-bold text-ink">
        {stat.value}
        {stat.suffix}
      </p>
      <p className="mt-1 text-sm text-ink-muted">{stat.label}</p>
    </motion.div>
  )
}
