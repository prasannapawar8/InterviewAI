import { useNavigate } from 'react-router-dom'
import { Eye } from 'lucide-react'
import Avatar from '../ui/Avatar'
import Badge from '../ui/Badge'
import { cn } from '../../utils/cn'

function ScorePill({ score }) {
  const tone =
    score >= 85 ? 'text-success' : score >= 70 ? 'text-primary' : score >= 50 ? 'text-warning' : 'text-danger'
  return <span className={cn('font-semibold', tone)}>{score}</span>
}

export default function RecentAnalysesTable({ data = [] }) {
  const navigate = useNavigate()

  return (
    <div className="overflow-hidden">
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs font-semibold uppercase tracking-wider text-ink-subtle">
              <th className="px-4 py-3">Candidate</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Sentiment</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.map((row) => (
              <tr
                key={row.id}
                onClick={() => navigate(`/results/${row.id}`)}
                className="cursor-pointer transition-colors hover:bg-surface-2"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={row.candidate} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{row.candidate}</p>
                      <p className="truncate text-xs text-ink-subtle">{row.role}</p>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{row.date}</td>
                <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{row.duration}</td>
                <td className="px-4 py-3">
                  <ScorePill score={row.score} />
                </td>
                <td className="px-4 py-3">
                  <Badge>{row.sentiment}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge>{row.status}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/results/${row.id}`)
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-subtle hover:bg-surface-3 hover:text-ink"
                    aria-label="View analysis"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {data.map((row) => (
          <button
            key={row.id}
            onClick={() => navigate(`/results/${row.id}`)}
            className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface-2 p-3 text-left"
          >
            <Avatar name={row.candidate} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink">{row.candidate}</p>
              <p className="truncate text-xs text-ink-subtle">
                {row.role} · {row.date}
              </p>
            </div>
            <div className="text-right">
              <ScorePill score={row.score} />
              <div className="mt-1">
                <Badge>{row.sentiment}</Badge>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
