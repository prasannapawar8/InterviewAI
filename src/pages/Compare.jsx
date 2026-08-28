import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import PageTransition from '../components/ui/PageTransition'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { ChartSkeleton, Skeleton } from '../components/ui/Skeleton'
import { analysisService } from '../services/api'
import { cn } from '../utils/cn'

function metric(data, key) {
  return data?.communicationMetrics?.find((m) => m.key === key)?.value
}

function TalkBar({ pct, label }) {
  const n = Number(pct) || 0
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-ink-muted">
        <span>{label}</span>
        <span className="tabular-nums font-medium text-ink">{n}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${Math.min(100, n)}%` }} />
      </div>
    </div>
  )
}

function Column({ data, label, peerScore }) {
  if (!data) return null
  const rec = data.decision || data.overview?.recommendation
  const score = data.overview?.overallScore ?? data.score
  const ahead = peerScore != null && score != null && score > peerScore
  const pace = metric(data, 'pace')
  const fillers = metric(data, 'fillers')

  return (
    <Card className="h-full">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">{label}</p>
      <h2 className="mt-1 text-xl font-bold text-ink">{data.overview?.candidate}</h2>
      <p className="text-sm text-ink-muted">{data.overview?.role}</p>
      <p
        className={cn(
          'mt-5 text-4xl font-extrabold tabular-nums',
          ahead ? 'text-success' : 'text-ink',
        )}
      >
        {score ?? '—'}
        <span className="text-lg font-semibold text-ink-subtle">/100</span>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {data.overview?.recommendation ? <Badge>{data.overview.recommendation}</Badge> : null}
        {data.decision ? <Badge>{data.decision}</Badge> : <Badge variant="neutral">No recruiter decision</Badge>}
        {data.sentiment ? <Badge>{data.sentiment}</Badge> : null}
      </div>
      <div className="mt-6 space-y-4">
        <TalkBar pct={data.talkTime?.candidateTalkPct} label="Candidate talk-time" />
        <dl className="space-y-3 text-sm">
          <Row k="STAR" v={data.starCoverage ? `${data.starCoverage.found}/${data.starCoverage.total}` : '—'} />
          <Row k="Pace" v={pace != null ? `${pace} wpm` : '—'} />
          <Row k="Fillers" v={fillers ?? '—'} />
        </dl>
      </div>
      <Link
        to={`/results/${data.overview?.id}`}
        className="mt-6 inline-block text-sm font-semibold text-primary hover:underline"
      >
        Open full report
      </Link>
    </Card>
  )
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line pb-2">
      <dt className="text-ink-subtle">{k}</dt>
      <dd className="font-medium text-ink">{v}</dd>
    </div>
  )
}

export default function Compare() {
  const [params] = useSearchParams()
  const aId = params.get('a')
  const bId = params.get('b')
  const [left, setLeft] = useState(null)
  const [right, setRight] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(Boolean(aId && bId))

  useEffect(() => {
    let active = true
    if (!aId || !bId) {
      setLoading(false)
      setError('')
      setLeft(null)
      setRight(null)
      return undefined
    }
    setLoading(true)
    setError('')
    Promise.all([analysisService.getResult(aId), analysisService.getResult(bId)])
      .then(([a, b]) => {
        if (!active) return
        setLeft(a)
        setRight(b)
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        setError(err.message)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [aId, bId])

  const leftScore = left?.overview?.overallScore ?? left?.score
  const rightScore = right?.overview?.overallScore ?? right?.score
  const missingIds = !aId || !bId

  return (
    <PageTransition>
      <Link
        to="/results"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" /> Back to analyses
      </Link>
      <PageHeader
        title="Compare candidates"
        subtitle="Score, talk-time, STAR, and recruiter decision side by side."
      />
      {missingIds ? (
        <Card className="px-6 py-12 text-center">
          <p className="text-base font-semibold text-ink">Pick two completed interviews</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">
            On the analyses list, check two rows and click Compare to see them here.
          </p>
          <Link to="/results">
            <Button variant="gradient" className="mt-6">
              Go to analyses
            </Button>
          </Link>
        </Card>
      ) : error ? (
        <Card className="p-6 text-sm text-ink-muted">{error}</Card>
      ) : loading ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <Card key={i}>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="mt-3 h-10 w-24" />
              <ChartSkeleton className="mt-6 h-40" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <Column data={left} label="Candidate A" peerScore={rightScore} />
          <Column data={right} label="Candidate B" peerScore={leftScore} />
        </div>
      )}
    </PageTransition>
  )
}
