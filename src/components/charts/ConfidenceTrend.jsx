import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import ChartTooltip from './ChartTooltip'
import { confidenceTrend } from '../../services/mockData'

const axisStyle = { fontSize: 12, fill: '#94a3b8' }

export default function ConfidenceTrend({ data = confidenceTrend }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="conf-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#4F46E5" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" vertical={false} />
          <XAxis dataKey="time" tick={axisStyle} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} tick={axisStyle} tickLine={false} axisLine={false} />
          <Tooltip content={<ChartTooltip suffix="%" />} />
          <Line
            type="monotone"
            dataKey="confidence"
            name="Confidence"
            stroke="url(#conf-line)"
            strokeWidth={3}
            dot={{ r: 4, fill: '#7C3AED', strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
