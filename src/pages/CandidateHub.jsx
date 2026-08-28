import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import PageTransition from '../components/ui/PageTransition'
import PageHeader from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import { TableSkeleton } from '../components/ui/Skeleton'
import { analysisService } from '../services/api'
import { useToast } from '../context/ToastContext'
import { cn } from '../utils/cn'

function ScoreLine({ interviews }) {
  const scores = interviews.map((i) => i.score).filter((s) => s != null)
  if (!scores.length) return null
  const max = Math.max(...scores, 1)
  return (
    <div className="mt-4 flex items-end gap-1 h-16">
      {scores.slice(0, 12).reverse().map((s, i) => (
        <div
          key={i}
          className="flex-1 rounded-t bg-brand-gradient min-w-[8px]"
          style={{ height: `${Math.round((s / max) * 100)}%` }}
          title={`${s}`}
        />
      ))}
    </div>
  )
}

export default function CandidateHub() {
  const { name } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [hubs, setHubs] = useState([])
  const [hub, setHub] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    const load = name
      ? analysisService.getCandidate(name)
      : analysisService.listCandidates()
    load
      .then((data) => {
        if (!active) return
        if (name) setHub(data)
        else setHubs(data)
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        toast.error('Could not load candidates', err.message)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [name])

  if (name) {
    return (
      <PageTransition>
        <button
          type="button"
          onClick={() => navigate('/candidates')}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" /> All candidates
        </button>
        {loading || !hub ? (
          <TableSkeleton rows={5} />
        ) : (
          <>
            <PageHeader
              title={hub.name}
              subtitle={`${hub.count} interview${hub.count === 1 ? '' : 's'} · avg score ${hub.avgScore ?? '—'}`}
            />
            {hub.decision ? <Badge>{hub.decision}</Badge> : null}
            <ScoreLine interviews={hub.interviews} />
            <Card className="mt-6 overflow-hidden">
              <ul className="divide-y divide-line">
                {hub.interviews.map((row) => (
                  <li key={row.id}>
                    <Link
                      to={`/results/${row.id}`}
                      className="flex items-center justify-between gap-3 px-2 py-3 hover:bg-surface-2"
                    >
                      <span>
                        <span className="block font-medium text-ink">{row.role}</span>
                        <span className="text-xs text-ink-subtle">{row.date}</span>
                      </span>
                      <span className={cn('font-semibold tabular-nums', (row.score ?? 0) >= 70 ? 'text-success' : 'text-ink')}>
                        {row.score ?? '—'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <PageHeader
        title="Candidates"
        subtitle="Group interviews by name — useful when the same person has multiple rounds."
      />
      {loading ? (
        <TableSkeleton rows={6} />
      ) : hubs.length === 0 ? (
        <Card className="py-12 text-center text-sm text-ink-muted">No candidates yet. Upload an interview.</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {hubs.map((h) => (
            <button
              key={h.name}
              type="button"
              onClick={() => navigate(`/candidates/${encodeURIComponent(h.name)}`)}
              className="rounded-2xl border border-line bg-surface p-5 text-left shadow-soft transition hover:border-primary/30 hover:shadow-card"
            >
              <div className="flex items-center gap-3">
                <Avatar name={h.name} size="md" />
                <div>
                  <p className="font-semibold text-ink">{h.name}</p>
                  <p className="text-xs text-ink-subtle">
                    {h.count} round{h.count === 1 ? '' : 's'} · last {h.latestDate}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-ink-muted">Avg {h.avgScore ?? '—'}</span>
                {h.decision ? <Badge>{h.decision}</Badge> : null}
              </div>
            </button>
          ))}
        </div>
      )}
    </PageTransition>
  )
}
