import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'

export default function ProgressBar({ value = 0, className, barClassName, gradient = true }) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className={cn('h-2.5 w-full overflow-hidden rounded-full bg-surface-3', className)}>
      <motion.div
        className={cn(
          'h-full rounded-full',
          gradient ? 'bg-brand-gradient' : 'bg-primary',
          barClassName,
        )}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
    </div>
  )
}
