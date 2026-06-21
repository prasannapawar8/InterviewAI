import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import ChartTooltip from './ChartTooltip'
import { sentimentTimeline } from '../../services/mockData'

const axisStyle = { fontSize: 12, fill: '#94a3b8' }

export default function SentimentTimeline({ data = sentimentTimeline }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="grad-pos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="grad-neu" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="grad-neg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" vertical={false} />
          <XAxis dataKey="time" tick={axisStyle} tickLine={false} axisLine={false} />
          <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
          <Tooltip content={<ChartTooltip suffix="%" />} />
          <Area
            type="monotone"
            dataKey="positive"
            name="Positive"
            stroke="#10B981"
            strokeWidth={2}
            fill="url(#grad-pos)"
          />
          <Area
            type="monotone"
            dataKey="neutral"
            name="Neutral"
            stroke="#06B6D4"
            strokeWidth={2}
            fill="url(#grad-neu)"
          />
          <Area
            type="monotone"
            dataKey="negative"
            name="Negative"
            stroke="#EF4444"
            strokeWidth={2}
            fill="url(#grad-neg)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
