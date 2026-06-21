// Shared custom tooltip — styled with Tailwind so it adapts to the theme.
export default function ChartTooltip({ active, payload, label, suffix = '' }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="rounded-xl border border-line bg-surface px-3.5 py-2.5 shadow-card">
      {label && <p className="mb-1.5 text-xs font-semibold text-ink">{label}</p>}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color || entry.fill }}
            />
            <span className="text-ink-muted">{entry.name}</span>
            <span className="ml-auto font-semibold text-ink">
              {entry.value}
              {suffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
