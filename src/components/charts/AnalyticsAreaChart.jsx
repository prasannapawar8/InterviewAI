import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import ChartTooltip from './ChartTooltip'
import { monthlyOverview } from '../../services/mockData'

const axisStyle = { fontSize: 12, fill: '#94a3b8' }

export default function AnalyticsAreaChart({ data = monthlyOverview }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="ov-interviews" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="ov-confidence" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" vertical={false} />
          <XAxis dataKey="month" tick={axisStyle} tickLine={false} axisLine={false} />
          <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(v) => <span className="text-ink-muted">{v}</span>}
          />
          <Area
            type="monotone"
            dataKey="interviews"
            name="Interviews"
            stroke="#4F46E5"
            strokeWidth={2.5}
            fill="url(#ov-interviews)"
          />
          <Area
            type="monotone"
            dataKey="confidence"
            name="Avg Confidence"
            stroke="#06B6D4"
            strokeWidth={2.5}
            fill="url(#ov-confidence)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
