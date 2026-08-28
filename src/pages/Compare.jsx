import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import PageTransition from '../components/ui/PageTransition'
import { Card } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { analysisService } from '../services/api'

function metric(data, key) {
  return data?.communicationMetrics?.find((m) => m.key === key)?.value ?? '—'
}

function Column({ data, label }) {
  if (!data) {
    return (
      <Card>
        <p className="text-sm text-ink-muted">{label}: not loaded</p>
      </Card>
    )
  }
  const rec = data.decision || data.overview?.recommendation
  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">{label}</p>
      <h2 className="mt-1 text-xl font-bold text-ink">{data.overview?.candidate}</h2>
      <p className="text-sm text-ink-muted">{data.overview?.role}</p>
      <dl className="mt-5 space-y-3 text-sm">
        <Row k="Overall score" v={`${data.overview?.overallScore ?? data.score}/100`} />
        <Row k="AI recommendation" v={data.overview?.recommendation || '—'} />
        <Row k="Recruiter decision" v={data.decision || '—'} />
        <Row k="Sentiment" v={data.sentiment || '—'} />
        <Row k="Candidate talk" v={data.talkTime ? `${data.talkTime.candidateTalkPct}%` : '—'} />
        <Row k="STAR" v={data.starCoverage ? `${data.starCoverage.found}/${data.starCoverage.total}` : '—'} />
        <Row k="Pace" v={`${metric(data, 'pace')} wpm`} />
        <Row k="Fillers" v={metric(data, 'fillers')} />
      </dl>
      <div className="mt-4">
        <Badge>{rec || 'No decision'}</Badge>
      </div>
      <Link to={`/results/${data.overview?.id}`} className="mt-4 inline-block text-sm font-semibold text-primary">
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

  useEffect(() => {
    let active = true
    if (!aId || !bId) {
      setError('Pick two completed analyses from the list to compare.')
      return undefined
    }
    Promise.all([analysisService.getResult(aId), analysisService.getResult(bId)])
      .then(([a, b]) => {
        if (!active) return
        setLeft(a)
        setRight(b)
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
    return () => {
      active = false
    }
  }, [aId, bId])

  return (
    <PageTransition>
      <Link to="/results" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ChevronLeft className="h-4 w-4" /> Back to analyses
      </Link>
      <h1 className="text-2xl font-bold text-ink">Compare candidates</h1>
      <p className="mt-1 mb-6 text-sm text-ink-muted">In-house scores, talk-time, and STAR — not an API comparison.</p>
      {error ? (
        <Card className="p-6 text-sm text-ink-muted">{error}</Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <Column data={left} label="Candidate A" />
          <Column data={right} label="Candidate B" />
        </div>
      )}
    </PageTransition>
  )
}
