import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Columns2, Download, Search } from 'lucide-react'
import PageTransition from '../components/ui/PageTransition'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { TableSkeleton } from '../components/ui/Skeleton'
import { analysisService } from '../services/api'
import { useToast } from '../context/ToastContext'

export default function AnalysesList() {
  const navigate = useNavigate()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [csvLoading, setCsvLoading] = useState(false)
  const [pick, setPick] = useState([])

  const q = params.get('q') || ''
  const status = params.get('status') || ''
  const recommendation = params.get('recommendation') || ''
  const minScore = params.get('minScore') || ''
  const maxScore = params.get('maxScore') || ''

  const filters = { q, status, recommendation, minScore, maxScore }

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
  }, [q, status, recommendation, minScore, maxScore])

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

  return (
    <PageTransition>
      <PageHeader
        title="Analyses"
        subtitle="Search, filter, compare two candidates, or export metrics to CSV."
        actions={
          <div className="flex flex-wrap gap-2">
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
        }
      />

      <Card className="mb-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
            <input
              value={q}
              onChange={(e) => setFilter('q', e.target.value)}
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
          Select two rows with the checkboxes, then Compare. Recruiter decision overrides the AI recommendation in filters.
        </p>
      </Card>

      <Card>
        {loading ? (
          <TableSkeleton rows={8} />
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">No analyses match these filters.</p>
        ) : (
          <AnalysesPickTable data={items} pick={pick} onToggle={togglePick} />
        )}
      </Card>
    </PageTransition>
  )
}

function AnalysesPickTable({ data, pick, onToggle }) {
  const navigate = useNavigate()
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs font-semibold uppercase tracking-wider text-ink-subtle">
            <th className="px-3 py-3 w-10"> </th>
            <th className="px-4 py-3">Candidate</th>
            <th className="px-4 py-3">Score</th>
            <th className="px-4 py-3">Recommendation</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {data.map((row) => (
            <tr key={row.id} className="hover:bg-surface-2">
              <td className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={pick.includes(row.id)}
                  onChange={() => onToggle(row.id)}
                  disabled={row.status !== 'Completed' && !pick.includes(row.id)}
                />
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  className="text-left font-medium text-ink hover:text-primary"
                  onClick={() => navigate(`/results/${row.id}`)}
                >
                  {row.candidate}
                  <span className="mt-0.5 block text-xs font-normal text-ink-subtle">{row.role}</span>
                </button>
              </td>
              <td className="px-4 py-3 tabular-nums">{row.score ?? '—'}</td>
              <td className="px-4 py-3">{row.recommendation || '—'}</td>
              <td className="px-4 py-3">{row.status}</td>
              <td className="px-4 py-3 text-ink-muted">{row.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
