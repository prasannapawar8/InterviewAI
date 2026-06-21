import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import ChartTooltip from './ChartTooltip'
import { sentimentBreakdown } from '../../services/mockData'

export default function SentimentPieChart({ data = sentimentBreakdown }) {
  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative h-52 w-52 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={88}
              paddingAngle={3}
              stroke="none"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip suffix="%" />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-ink">{data[0]?.value}%</span>
          <span className="text-xs font-medium text-ink-muted">Positive</span>
        </div>
      </div>

      <ul className="flex-1 space-y-3 self-stretch">
        {data.map((entry) => (
          <li key={entry.name} className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-sm font-medium text-ink">{entry.name}</span>
            <span className="ml-auto text-sm font-semibold text-ink-muted">
              {Math.round((entry.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
