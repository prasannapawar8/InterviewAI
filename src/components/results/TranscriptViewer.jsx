import { useMemo, useState } from 'react'
import { Search, X, User, Mic } from 'lucide-react'
import { cn } from '../../utils/cn'

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

function isCandidate(line) {
  return String(line.speaker || '').toLowerCase().includes('candid')
}

export default function TranscriptViewer({ transcript = [] }) {
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const counts = useMemo(() => {
    let interviewer = 0
    let candidate = 0
    for (const line of transcript) {
      if (isCandidate(line)) candidate += 1
      else interviewer += 1
    }
    return { interviewer, candidate }
  }, [transcript])

  const visible = useMemo(() => {
    return transcript.filter((line) => {
      if (roleFilter === 'candidate' && !isCandidate(line)) return false
      if (roleFilter === 'interviewer' && isCandidate(line)) return false
      if (query && !line.text.toLowerCase().includes(query.toLowerCase())) return false
      return true
    })
  }, [transcript, query, roleFilter])

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
          <Mic className="h-3.5 w-3.5" />
          Interviewer · {counts.interviewer}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-2.5 py-1 text-xs font-semibold text-secondary">
          <User className="h-3.5 w-3.5" />
          Candidate · {counts.candidate}
        </span>
      </div>

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-subtle" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search transcript…"
          className="h-11 w-full rounded-xl border border-line bg-surface-2 pl-11 pr-24 text-sm text-ink placeholder:text-ink-subtle focus-ring"
        />
        {query && (
          <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-2">
            <span className="text-xs font-medium text-ink-subtle">
              {visible.length} match{visible.length !== 1 && 'es'}
            </span>
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

      <div className="mb-4 flex gap-1 rounded-xl bg-surface-2 p-1">
        {[
          { id: 'all', label: 'All speakers' },
          { id: 'interviewer', label: 'Interviewer' },
          { id: 'candidate', label: 'Candidate' },
        ].map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setRoleFilter(opt.id)}
            className={cn(
              'flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
              roleFilter === opt.id ? 'bg-surface text-ink shadow-soft' : 'text-ink-muted hover:text-ink',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
        {visible.length === 0 && (
          <p className="py-8 text-center text-sm text-ink-muted">No lines match this filter.</p>
        )}
        {visible.map((line, i) => {
          const candidate = isCandidate(line)
          return (
            <div
              key={`${line.time}-${i}`}
              className={cn('flex gap-3', candidate ? 'flex-row-reverse' : 'flex-row')}
            >
              <div
                className={cn(
                  'mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white',
                  candidate ? 'bg-secondary' : 'bg-accent',
                )}
                aria-hidden
              >
                {candidate ? 'C' : 'I'}
              </div>
              <div className={cn('min-w-0 max-w-[85%] sm:max-w-[75%]', candidate ? 'items-end' : 'items-start')}>
                <div className={cn('mb-1 flex items-center gap-2', candidate && 'flex-row-reverse')}>
                  <span className={cn('text-xs font-semibold', candidate ? 'text-secondary' : 'text-accent')}>
                    {candidate ? 'Candidate' : 'Interviewer'}
                  </span>
                  <span className="font-mono text-[11px] font-medium text-ink-subtle tabular-nums">{line.time}</span>
                </div>
                <div
                  className={cn(
                    'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                    candidate
                      ? 'rounded-tr-md bg-secondary/10 text-ink'
                      : 'rounded-tl-md bg-accent/10 text-ink',
                  )}
                >
                  {highlight(line.text, query)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
