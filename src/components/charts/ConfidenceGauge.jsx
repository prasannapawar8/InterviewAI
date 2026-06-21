import { motion } from 'framer-motion'

/**
 * Circular confidence gauge (0–100%) drawn with SVG.
 * The arc is a gradient stroke animated with framer-motion.
 */
export default function ConfidenceGauge({
  value = 0,
  size = 200,
  strokeWidth = 16,
  label = 'Confidence',
}) {
  const clamped = Math.max(0, Math.min(100, value))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  // Use a 3/4 arc (270deg) for a gauge feel
  const arc = 0.75
  const dash = circumference * arc
  const offset = dash * (1 - clamped / 100)

  const tone =
    clamped >= 80 ? '#10B981' : clamped >= 60 ? '#4F46E5' : clamped >= 40 ? '#F59E0B' : '#EF4444'
  const toneLabel =
    clamped >= 80 ? 'Excellent' : clamped >= 60 ? 'Strong' : clamped >= 40 ? 'Moderate' : 'Low'

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-[135deg]">
        <defs>
          <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="50%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
        {/* track — stroke via style so the CSS var resolves (var() is ignored in SVG attrs) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          style={{ stroke: 'rgb(var(--surface-3))' }}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
        {/* value arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#gauge-grad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          initial={{ strokeDashoffset: dash }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-ink">{clamped}%</span>
        <span className="mt-0.5 text-sm font-medium" style={{ color: tone }}>
          {toneLabel}
        </span>
        <span className="mt-0.5 text-xs text-ink-subtle">{label}</span>
      </div>
    </div>
  )
}
