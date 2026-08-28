import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Columns2, Download, Search, UploadCloud, Archive, ArchiveRestore } from 'lucide-react'
import PageTransition from '../components/ui/PageTransition'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import { TableSkeleton } from '../components/ui/Skeleton'
import { analysisService } from '../services/api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { cn } from '../utils/cn'

function ScorePill({ score }) {
  if (score == null) return <span className="text-ink-subtle">—</span>
  const tone =
    score >= 85 ? 'text-success' : score >= 70 ? 'text-primary' : score >= 50 ? 'text-warning' : 'text-danger'
  return <span className={cn('font-semibold tabular-nums', tone)}>{score}</span>
}

export default function AnalysesList() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const canArchive = ['owner', 'admin', 'recruiter'].includes(user?.membershipRole)
  const [params, setParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [csvLoading, setCsvLoading] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [pick, setPick] = useState([])
  const [qDraft, setQDraft] = useState(params.get('q') || '')

  const q = params.get('q') || ''
  const status = params.get('status') || ''
  const recommendation = params.get('recommendation') || ''
  const minScore = params.get('minScore') || ''
  const maxScore = params.get('maxScore') || ''
  const archived = params.get('archived') === '1'
  const filters = { q, status, recommendation, minScore, maxScore, archived }
  const hasFilters = Boolean(q || status || recommendation || minScore || maxScore)

  useEffect(() => {
    setQDraft(q)
  }, [q])

  useEffect(() => {
    const t = setTimeout(() => {
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        const current = next.get('q') || ''
        const nextQ = qDraft.trim()
        if (current === nextQ) return prev
        if (nextQ) next.set('q', nextQ)
        else next.delete('q')
        return next
      }, { replace: true })
    }, 300)
    return () => clearTimeout(t)
  }, [qDraft, setParams])

  useEffect(() => {
    let active = true
    setLoading(true)
    analysisService
      .listAnalyses(50, filters)
      .then((rows) => {
        if (!active) return
        setItems(rows)
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        toast.error('Could not load analyses', err.message)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [q, status, recommendation, minScore, maxScore, archived])

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }

  const togglePick = (id) => {
    setPick((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 2) return [prev[1], id]
      return [...prev, id]
    })
  }

  const downloadCsv = async () => {
    setCsvLoading(true)
    try {
      const blob = await analysisService.downloadCsv({ ...filters, limit: 200 })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'intervai-analyses.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error('CSV export failed', err.message)
    } finally {
      setCsvLoading(false)
    }
  }

  const setArchived = async (row, archived) => {
    setBusyId(row.id)
    try {
      await analysisService.archive(row.id, archived)
      setItems((prev) => prev.filter((r) => r.id !== row.id))
      setPick((prev) => prev.filter((id) => id !== row.id))
      toast.success(
        archived ? 'Moved to archive' : 'Restored',
        archived ? `${row.candidate} is in Archive.` : `${row.candidate} is back in Analysis Results.`,
      )
    } catch (err) {
      toast.error(archived ? 'Could not archive' : 'Could not restore', err.message)
    } finally {
      setBusyId('')
    }
  }

  return (
    <PageTransition>
      <PageHeader
        title={archived ? 'Archive' : 'Analyses'}
        subtitle={
          archived
            ? 'Interviews you have archived. Restore one to put it back in the main list.'
            : 'Search, filter, archive, compare two candidates, or export metrics to CSV.'
        }
      />

      <div className="sticky top-16 z-20 mb-4 flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-line bg-surface px-4 py-3 shadow-soft">
        <Button
          variant="outline"
          disabled={pick.length !== 2}
          onClick={() => navigate(`/compare?a=${pick[0]}&b=${pick[1]}`)}
        >
          <Columns2 className="h-4 w-4" />
          Compare {pick.length ? `(${pick.length}/2)` : ''}
        </Button>
        <Button variant="gradient" onClick={downloadCsv} loading={csvLoading}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="mb-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
            <input
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
              placeholder="Candidate or role"
              className="h-10 w-full rounded-xl border border-line bg-surface-2 pl-9 pr-3 text-sm focus-ring"
            />
          </label>
          <select
            value={status}
            onChange={(e) => setFilter('status', e.target.value)}
            className="h-10 rounded-xl border border-line bg-surface-2 px-3 text-sm focus-ring"
          >
            <option value="">All statuses</option>
            <option value="Completed">Completed</option>
            <option value="Processing">Processing</option>
            <option value="Failed">Failed</option>
          </select>
          <select
            value={recommendation}
            onChange={(e) => setFilter('recommendation', e.target.value)}
            className="h-10 rounded-xl border border-line bg-surface-2 px-3 text-sm focus-ring"
          >
            <option value="">All recommendations</option>
            <option value="Advance">Advance</option>
            <option value="Consider">Consider</option>
            <option value="Reject">Reject</option>
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              max="100"
              placeholder="Min score"
              value={minScore}
              onChange={(e) => setFilter('minScore', e.target.value)}
              className="h-10 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm focus-ring"
            />
            <input
              type="number"
              min="0"
              max="100"
              placeholder="Max"
              value={maxScore}
              onChange={(e) => setFilter('maxScore', e.target.value)}
              className="h-10 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm focus-ring"
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-subtle">
          Select two completed interviews, then Compare. Use Archive on a row to hide it from this list.
        </p>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-ink-muted">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-line text-primary"
            checked={archived}
            onChange={(e) => setFilter('archived', e.target.checked ? '1' : '')}
          />
          View archived interviews
        </label>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={8} />
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-base font-semibold text-ink">
              {archived && !hasFilters
                ? 'Archive is empty'
                : hasFilters
                  ? 'No interviews match these filters'
                  : 'No analyses yet'}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
              {hasFilters
                ? 'Clear a filter or search a different candidate name.'
                : archived
                  ? 'Archive an interview from Analysis Results or from the report header.'
                  : 'Upload a recording to generate a transcript, score, and hiring notes.'}
            </p>
            {archived && !hasFilters ? (
              <Button variant="outline" className="mt-6" onClick={() => setFilter('archived', '')}>
                Back to analyses
              </Button>
            ) : (
              <Button variant="gradient" className="mt-6" onClick={() => navigate('/upload')}>
                <UploadCloud className="h-4 w-4" />
                Upload interview
              </Button>
            )}
          </div>
        ) : (
          <AnalysesPickTable
            data={items}
            pick={pick}
            onToggle={togglePick}
            canArchive={canArchive}
            busyId={busyId}
            viewingArchived={archived}
            onSetArchived={setArchived}
          />
        )}
      </Card>
    </PageTransition>
  )
}

function AnalysesPickTable({ data, pick, onToggle, canArchive, busyId, viewingArchived, onSetArchived }) {
  const navigate = useNavigate()
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs font-semibold uppercase tracking-wider text-ink-subtle">
            <th className="w-12 px-4 py-3"> </th>
            <th className="px-4 py-3">Candidate</th>
            <th className="px-4 py-3">Score</th>
            <th className="px-4 py-3">Recommendation</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Date</th>
            {canArchive ? <th className="px-4 py-3 text-right">Archive</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {data.map((row) => {
            const selected = pick.includes(row.id)
            return (
              <tr
                key={row.id}
                className={cn('transition-colors hover:bg-surface-2', selected && 'bg-primary/5')}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-line text-primary focus-ring"
                    checked={selected}
                    onChange={() => onToggle(row.id)}
                    disabled={row.status !== 'Completed' && !selected}
                    aria-label={`Select ${row.candidate} for compare`}
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="flex min-w-0 items-center gap-3 text-left"
                    onClick={() => navigate(`/results/${row.id}`)}
                  >
                    <Avatar name={row.candidate} size="sm" />
                    <span>
                      <span className="block font-medium text-ink hover:text-primary">{row.candidate}</span>
                      <span className="block text-xs font-normal text-ink-subtle">{row.role}</span>
                      {row.archived ? <span className="text-xs text-warning">Archived</span> : null}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="mt-1 text-xs font-medium text-primary hover:underline"
                    onClick={() => navigate(`/candidates/${encodeURIComponent(row.candidate)}`)}
                  >
                    All rounds
                  </button>
                </td>
                <td className="px-4 py-3">
                  <ScorePill score={row.score} />
                </td>
                <td className="px-4 py-3">
                  {row.recommendation ? <Badge>{row.recommendation}</Badge> : <span className="text-ink-subtle">—</span>}
                </td>
                <td className="px-4 py-3">
                  <Badge>{row.status}</Badge>
                </td>
                <td className="px-4 py-3 text-ink-muted">{row.date}</td>
                {canArchive ? (
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      loading={busyId === row.id}
                      onClick={() => onSetArchived(row, !viewingArchived && !row.archived)}
                    >
                      {viewingArchived || row.archived ? (
                        <>
                          <ArchiveRestore className="h-3.5 w-3.5" /> Restore
                        </>
                      ) : (
                        <>
                          <Archive className="h-3.5 w-3.5" /> Archive
                        </>
                      )}
                    </Button>
                  </td>
                ) : null}
              </tr>
            )
          })}
        </tbody>
      </table>
            </div>
  )
}
