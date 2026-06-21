import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '../../utils/cn'

// Highlights all case-insensitive occurrences of `query` inside `text`
function highlight(text, query) {
  if (!query) return text
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${safe})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="rounded bg-warning/30 px-0.5 text-ink">
        {part}
      </mark>
    ) : (
      part
    ),
  )
}

export default function TranscriptViewer({ transcript = [] }) {
  const [query, setQuery] = useState('')

  const matches = useMemo(() => {
    if (!query) return transcript.length
    return transcript.filter((t) => t.text.toLowerCase().includes(query.toLowerCase())).length
  }, [query, transcript])

  return (
    <div>
      {/* Search */}
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-subtle" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search transcript…"
          className="h-11 w-full rounded-xl border border-line bg-surface-2 pl-11 pr-24 text-sm text-ink placeholder:text-ink-subtle focus-ring"
        />
        {query && (
          <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-2">
            <span className="text-xs font-medium text-ink-subtle">{matches} match{matches !== 1 && 'es'}</span>
            <button
              onClick={() => setQuery('')}
              className="rounded-md p-1 text-ink-subtle hover:bg-surface-3 hover:text-ink"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Transcript with timestamp markers */}
      <div className="max-h-[28rem] space-y-1 overflow-y-auto pr-1">
        {transcript.map((line, i) => {
          const isCandidate = line.speaker === 'Candidate'
          const hidden = query && !line.text.toLowerCase().includes(query.toLowerCase())
          return (
            <div
              key={i}
              className={cn(
                'group flex gap-3 rounded-xl p-3 transition-colors hover:bg-surface-2',
                hidden && 'opacity-30',
              )}
            >
              {/* Timestamp marker */}
              <button className="mt-0.5 shrink-0 font-mono text-xs font-semibold text-primary tabular-nums hover:underline">
                {line.time}
              </button>
              <div className="min-w-0">
                <span
                  className={cn(
                    'text-xs font-semibold',
                    isCandidate ? 'text-secondary' : 'text-accent',
                  )}
                >
                  {line.speaker}
                </span>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">
                  {highlight(line.text, query)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
