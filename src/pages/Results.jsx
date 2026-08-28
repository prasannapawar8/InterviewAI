import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Calendar,
  Clock,
  User,
  Award,
  Download,
  Share2,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import PageTransition from '../components/ui/PageTransition'
import Button from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { ChartSkeleton, Skeleton } from '../components/ui/Skeleton'
import SentimentPieChart from '../components/charts/SentimentPieChart'
import SentimentTimeline from '../components/charts/SentimentTimeline'
import ConfidenceGauge from '../components/charts/ConfidenceGauge'
import ConfidenceTrend from '../components/charts/ConfidenceTrend'
import TranscriptViewer from '../components/results/TranscriptViewer'
import MetricTile from '../components/results/MetricTile'
import { analysisService } from '../services/api'
import { useToast } from '../context/ToastContext'
import { formatDate } from '../utils/format'
import { cn } from '../utils/cn'

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'transcript', label: 'Transcript' },
  { id: 'sentiment', label: 'Sentiment' },
  { id: 'confidence', label: 'Confidence' },
  { id: 'metrics', label: 'Metrics' },
  { id: 'summary', label: 'AI Summary' },
]

function SectionTitle({ tag, title, subtitle }) {
  return (
    <div className="mb-5">
      <span className="text-xs font-semibold uppercase tracking-wider text-primary">{tag}</span>
      <h2 className="mt-1 text-xl font-bold text-ink">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
    </div>
  )
}

export default function Results() {
  const navigate = useNavigate()
  const { id: paramId } = useParams()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        let id = paramId
        if (!id) {
          // No id in the URL (e.g. sidebar link) — open the most recent analysis
          const items = await analysisService.listAnalyses(1)
          if (!items.length) {
            if (active) {
              setError('No analyses yet. Upload an interview to get started.')
              setLoading(false)
            }
            return
          }
          id = items[0].id
          navigate(`/results/${id}`, { replace: true })
        }
        const res = await analysisService.getResult(id)
        if (!active) return
        setData(res)
        setLoading(false)
      } catch (err) {
        if (!active) return
        setError(err.message || 'Could not load this analysis')
        setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [paramId, navigate])

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const downloadPdf = async () => {
    if (!data) return
    setDownloading(true)
    try {
      const blob = await analysisService.downloadReport(data.overview.id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `intervai-report-${data.overview.candidate.replace(/\s+/g, '-').toLowerCase()}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success('Report downloaded', 'Your PDF report has been generated.')
    } catch (err) {
      toast.error('Download failed', err.message)
    } finally {
      setDownloading(false)
    }
  }

  if (error) {
    return (
      <PageTransition>
        <Card className="mx-auto max-w-md p-8 text-center">
          <p className="text-lg font-semibold text-ink">Couldn&apos;t load this analysis</p>
          <p className="mt-2 text-sm text-ink-muted">{error}</p>
          <Button variant="gradient" className="mt-6" onClick={() => navigate('/dashboard')}>
            Back to dashboard
          </Button>
        </Card>
      </PageTransition>
    )
  }

  if (loading || !data) {
    return (
      <PageTransition>
        <Skeleton className="mb-6 h-9 w-64" />
        <Skeleton className="mb-6 h-32 w-full" />
        <div className="grid gap-5 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </PageTransition>
    )
  }

  const { overview, transcript, sentimentBreakdown, sentimentTimeline, confidenceTrend, communicationMetrics, strengths, weaknesses, aiSummary } = data
  const avgConfidence = Math.round(
    confidenceTrend.reduce((s, p) => s + p.confidence, 0) / confidenceTrend.length,
  )

  return (
    <PageTransition>
      {/* Back + section nav */}
      <div className="mb-6 flex flex-col gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" /> Back to dashboard
        </button>
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className="shrink-0 rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:border-primary/40 hover:text-primary"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* A. Interview Overview */}
      <section id="overview">
        <Card className="overflow-hidden p-0">
          <div className="bg-brand-gradient p-6 text-white sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Badge className="bg-white/20 text-white">{overview.recommendation}</Badge>
                <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{overview.candidate}</h1>
                <p className="mt-1 text-white/80">{overview.role}</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="border-white/40 bg-white/10 text-white hover:bg-white/20"
                  onClick={() =>
                    toast.info('Share link copied', 'Anyone with the link can view this report.')
                  }
                >
                  <Share2 className="h-4 w-4" /> Share
                </Button>
                <Button
                  className="bg-white text-primary hover:bg-white/90"
                  onClick={downloadPdf}
                  loading={downloading}
                >
                  <Download className="h-4 w-4" /> {downloading ? 'Generating…' : 'Download PDF'}
                </Button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-line border-t border-line sm:grid-cols-4">
            {[
              { icon: User, label: 'Candidate', value: overview.candidate.split(' ')[0] },
              { icon: Calendar, label: 'Interview Date', value: formatDate(overview.date) },
              { icon: Clock, label: 'Duration', value: overview.duration },
              { icon: Award, label: 'Overall Score', value: `${overview.overallScore}/100`, tone: true },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-4 sm:p-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-ink-subtle">{item.label}</p>
                  <p className={cn('truncate font-bold', item.tone ? 'text-success' : 'text-ink')}>
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* B. Speech-to-Text */}
      <section id="transcript" className="mt-8 scroll-mt-20">
        <Card>
          <CardHeader title="Transcript" subtitle="Full speech-to-text with timestamp markers" />
          <TranscriptViewer transcript={transcript} />
        </Card>
      </section>

      {/* C. Sentiment Analysis */}
      <section id="sentiment" className="mt-8 scroll-mt-20">
        <SectionTitle tag="Section C" title="Sentiment Analysis" subtitle="Emotional tone across the interview" />
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title="Sentiment Distribution" />
            <SentimentPieChart data={sentimentBreakdown} />
          </Card>
          <Card>
            <CardHeader title="Sentiment Timeline" subtitle="How tone shifted over time" />
            <SentimentTimeline data={sentimentTimeline} />
          </Card>
        </div>
      </section>

      {/* D. Confidence Estimation */}
      <section id="confidence" className="mt-8 scroll-mt-20">
        <SectionTitle tag="Section D" title="Confidence Estimation" subtitle="Delivery and assurance scoring" />
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="flex flex-col items-center justify-center">
            <ConfidenceGauge value={avgConfidence} />
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader title="Confidence Trend" subtitle="Confidence score throughout the session" />
            <ConfidenceTrend data={confidenceTrend} />
          </Card>
        </div>

        {/* Strengths & weaknesses */}
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-success/10 text-success">
                <ThumbsUp className="h-5 w-5" />
              </span>
              <h3 className="font-semibold text-ink">Strengths</h3>
            </div>
            <ul className="space-y-3">
              {strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-ink-muted">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  {s}
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-warning/10 text-warning">
                <ThumbsDown className="h-5 w-5" />
              </span>
              <h3 className="font-semibold text-ink">Areas to Improve</h3>
            </div>
            <ul className="space-y-3">
              {weaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-ink-muted">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  {w}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      {/* E. Communication Metrics */}
      <section id="metrics" className="mt-8 scroll-mt-20">
        <SectionTitle tag="Section E" title="Communication Metrics" subtitle="Key delivery indicators" />
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {communicationMetrics.map((m, i) => (
            <motion.div
              key={m.key}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <MetricTile metric={m} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* F. AI Summary Report */}
      <section id="summary" className="mt-8 scroll-mt-20">
        <SectionTitle tag="Section F" title="AI Summary Report" subtitle="Generated insights & recommendations" />
        <Card>
          <div className="mb-5 flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-gradient text-white">
              <Sparkles className="h-5 w-5" />
            </span>
            <h3 className="font-semibold text-ink">Executive Summary</h3>
          </div>
          <p className="text-sm leading-relaxed text-ink-muted">{aiSummary.executive}</p>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
                <CheckCircle2 className="h-4 w-4 text-success" /> Key Strengths
              </h4>
              <ul className="space-y-2">
                {aiSummary.keyStrengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-ink-muted">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
                <AlertTriangle className="h-4 w-4 text-warning" /> Areas for Improvement
              </h4>
              <ul className="space-y-2">
                {aiSummary.improvements.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-ink-muted">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Recommended actions */}
          <div className="mt-6 rounded-xl border border-line bg-surface-2 p-5">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
              <ArrowRight className="h-4 w-4 text-primary" /> Recommended Actions
            </h4>
            <div className="grid gap-3 sm:grid-cols-3">
              {aiSummary.recommendations.map((r, i) => (
                <div key={i} className="rounded-lg border border-line bg-surface p-3">
                  <span className="text-xs font-bold text-primary">0{i + 1}</span>
                  <p className="mt-1 text-sm text-ink-muted">{r}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t border-line pt-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <span className="text-sm text-ink-muted">Final recommendation:</span>
              <Badge variant="success">{aiSummary.recommendation}</Badge>
            </div>
            <Button variant="gradient" onClick={downloadPdf} loading={downloading}>
              <Download className="h-4 w-4" />
              {downloading ? 'Generating…' : 'Download PDF Report'}
            </Button>
          </div>
        </Card>
      </section>
    </PageTransition>
  )
}
