import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, UploadCloud, Sparkles, Play } from 'lucide-react'
import Button from '../ui/Button'

const STATS = [
  { value: '98%', label: 'Transcription accuracy' },
  { value: '50K+', label: 'Interviews analyzed' },
  { value: '2 min', label: 'Avg. processing time' },
]

const fade = {
  hidden: { opacity: 0, y: 20 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.1 } }),
}

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-brand-radial pt-32 pb-20 sm:pt-40 sm:pb-28">
      {/* floating blobs */}
      <div className="pointer-events-none absolute left-1/4 top-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl animate-float" />
      <div
        className="pointer-events-none absolute right-1/4 top-40 h-72 w-72 rounded-full bg-accent/20 blur-3xl animate-float"
        style={{ animationDelay: '2s' }}
      />

      <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          variants={fade}
          initial="hidden"
          animate="show"
          className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-4 py-1.5 text-sm font-medium text-ink-muted backdrop-blur"
        >
          <Sparkles className="h-4 w-4 text-primary" />
          Powered by advanced AI models
        </motion.div>

        <motion.h1
          variants={fade}
          initial="hidden"
          animate="show"
          custom={1}
          className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-ink sm:text-6xl"
        >
          AI-Powered{' '}
          <span className="text-gradient">Interview Analysis</span> Platform
        </motion.h1>

        <motion.p
          variants={fade}
          initial="hidden"
          animate="show"
          custom={2}
          className="mx-auto mt-6 max-w-2xl text-lg text-ink-muted"
        >
          Upload your interview recordings and let AI transcribe, analyze sentiment, estimate
          confidence, and generate detailed reports — turning conversations into objective,
          actionable hiring insights.
        </motion.p>

        <motion.div
          variants={fade}
          initial="hidden"
          animate="show"
          custom={3}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link to="/register">
            <Button variant="gradient" size="lg">
              Get Started
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <Link to="/upload">
            <Button variant="outline" size="lg">
              <UploadCloud className="h-5 w-5" />
              Upload Interview
            </Button>
          </Link>
        </motion.div>

        {/* Hero preview mock */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="relative mx-auto mt-16 max-w-4xl"
        >
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-danger/70" />
              <span className="h-3 w-3 rounded-full bg-warning/70" />
              <span className="h-3 w-3 rounded-full bg-success/70" />
              <span className="ml-3 text-xs font-medium text-ink-subtle">
                IntervAI — Analysis Dashboard
              </span>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-3">
              {[
                { label: 'Overall Score', value: '88', tone: 'text-primary' },
                { label: 'Confidence', value: '81%', tone: 'text-accent' },
                { label: 'Positive Sentiment', value: '58%', tone: 'text-success' },
              ].map((c) => (
                <div key={c.label} className="rounded-xl border border-line bg-surface-2 p-4 text-left">
                  <p className="text-xs font-medium text-ink-muted">{c.label}</p>
                  <p className={`mt-1 text-3xl font-bold ${c.tone}`}>{c.value}</p>
                </div>
              ))}
              <div className="sm:col-span-3">
                <div className="flex h-28 items-end gap-1.5 rounded-xl border border-line bg-surface-2 p-4">
                  {[40, 55, 48, 62, 71, 66, 78, 74, 82, 79, 88, 84].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.6, delay: 0.6 + i * 0.05 }}
                      className="flex-1 rounded-t bg-brand-gradient"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 hidden rounded-xl border border-line bg-surface p-3 shadow-card sm:flex sm:items-center sm:gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-success/10">
              <Play className="h-4 w-4 text-success" />
            </span>
            <div className="text-left">
              <p className="text-xs font-semibold text-ink">Report ready</p>
              <p className="text-[11px] text-ink-subtle">in 1m 48s</p>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="mx-auto mt-16 grid max-w-3xl grid-cols-3 gap-6">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-ink sm:text-4xl">{s.value}</p>
              <p className="mt-1 text-sm text-ink-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
