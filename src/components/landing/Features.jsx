import { motion } from 'framer-motion'
import { FileText, Smile, Gauge, ClipboardCheck, ArrowRight } from 'lucide-react'

const FEATURES = [
  {
    icon: FileText,
    title: 'Speech-to-Text Conversion',
    description:
      'Industry-leading transcription turns every word into a searchable, timestamped transcript with speaker labels.',
    accent: 'from-primary to-secondary',
  },
  {
    icon: Smile,
    title: 'Sentiment Analysis',
    description:
      'Detect positive, neutral, and negative tone across the conversation with a moment-by-moment sentiment timeline.',
    accent: 'from-accent to-primary',
  },
  {
    icon: Gauge,
    title: 'Confidence Estimation',
    description:
      'AI scores delivery, assurance, and composure on a 0–100 scale, complete with trend lines and key signals.',
    accent: 'from-secondary to-accent',
  },
  {
    icon: ClipboardCheck,
    title: 'Automated Summary Reports',
    description:
      'Generate executive summaries with strengths, improvement areas, and recommended next steps — exportable to PDF.',
    accent: 'from-success to-accent',
  },
]

const HOW = [
  { step: '01', title: 'Upload', text: 'Drag & drop your audio or video interview recording.' },
  { step: '02', title: 'Analyze', text: 'Our AI transcribes and evaluates the conversation.' },
  { step: '03', title: 'Review', text: 'Explore insights and download a polished report.' },
]

export default function Features() {
  return (
    <>
      <section id="features" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-primary">
              Features
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Everything you need to analyze interviews
            </h2>
            <p className="mt-4 text-lg text-ink-muted">
              A complete AI toolkit that transforms raw recordings into clear, objective insights.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group card p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card"
              >
                <div
                  className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${f.accent} text-white shadow-soft`}
                >
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-ink">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{f.description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Learn more <ArrowRight className="h-4 w-4" />
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-line bg-surface py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-secondary">
              How it works
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              From recording to report in three steps
            </h2>
          </div>

          <div className="relative mt-16 grid gap-8 md:grid-cols-3">
            {HOW.map((h, i) => (
              <motion.div
                key={h.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="relative text-center"
              >
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-gradient text-xl font-bold text-white shadow-glow">
                  {h.step}
                </div>
                <h3 className="mt-5 text-lg font-semibold text-ink">{h.title}</h3>
                <p className="mt-2 text-sm text-ink-muted">{h.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
