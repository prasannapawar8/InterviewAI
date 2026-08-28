import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { UploadCloud, ArrowRight } from 'lucide-react'
import PageTransition from '../components/ui/PageTransition'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import StatCard from '../components/dashboard/StatCard'
import RecentAnalysesTable from '../components/dashboard/RecentAnalysesTable'
import AnalyticsAreaChart from '../components/charts/AnalyticsAreaChart'
import SentimentPieChart from '../components/charts/SentimentPieChart'
import { StatCardSkeleton, TableSkeleton, ChartSkeleton } from '../components/ui/Skeleton'
import { dashboardService } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState([])
  const [recent, setRecent] = useState([])
  const [overview, setOverview] = useState([])

  useEffect(() => {
    let active = true
    Promise.all([
      dashboardService.getStats(),
      dashboardService.getRecentAnalyses(),
      dashboardService.getOverview(),
    ])
      .then(([s, r, o]) => {
        if (!active) return
        setStats(s)
        setRecent(r)
        setOverview(o)
        setLoading(false)
      })
      .catch(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <PageTransition>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0] || 'there'} 👋`}
        subtitle="Here's what's happening with your interviews today."
        actions={
          <Link to="/upload">
            <Button variant="gradient">
              <UploadCloud className="h-5 w-5" />
              New Analysis
            </Button>
          </Link>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : stats.map((stat, i) => <StatCard key={stat.key} stat={stat} index={i} />)}
      </div>

      {/* Charts */}
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Analytics Overview"
            subtitle="Interviews & average confidence over the last 12 months"
            action={<Badge variant="primary">+12.5% this month</Badge>}
          />
          {loading ? <ChartSkeleton className="h-72" /> : <AnalyticsAreaChart data={overview} />}
        </Card>

        <Card>
          <CardHeader title="Sentiment Distribution" subtitle="Across all interviews" />
          {loading ? <ChartSkeleton className="h-52" /> : <SentimentPieChart />}
        </Card>
      </div>

      {/* Recent analyses */}
      <Card className="mt-6">
        <CardHeader
          title="Recent Analyses"
          subtitle="Your latest processed interviews"
          action={
            <Link
              to="/results"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
        {loading ? <TableSkeleton rows={6} /> : <RecentAnalysesTable data={recent} />}
      </Card>
    </PageTransition>
  )
}
