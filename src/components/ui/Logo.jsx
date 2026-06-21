import { Link } from 'react-router-dom'
import { cn } from '../../utils/cn'

export default function Logo({ to = '/', className, showText = true, size = 'md' }) {
  const mark = (
    <span
      className={cn(
        'grid place-items-center rounded-xl bg-brand-gradient text-white shadow-soft',
        size === 'sm' ? 'h-8 w-8' : 'h-9 w-9',
      )}
    >
      {/* Audio-waveform glyph */}
      <svg viewBox="0 0 24 24" className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} fill="none">
        <path
          d="M5 9v6M9 5v14M12 8v8M15 5v14M19 9v6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )

  const content = (
    <>
      {mark}
      {showText && (
        <span className={cn('font-bold tracking-tight text-ink', size === 'sm' ? 'text-lg' : 'text-xl')}>
          Interv<span className="text-gradient">AI</span>
        </span>
      )}
    </>
  )

  if (to === null) {
    return <div className={cn('flex items-center gap-2.5', className)}>{content}</div>
  }

  return (
    <Link to={to} className={cn('flex items-center gap-2.5', className)}>
      {content}
    </Link>
  )
}
