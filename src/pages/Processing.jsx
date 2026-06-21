import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UploadCloud,
  FileText,
  Smile,
  Gauge,
  ClipboardCheck,
  Check,
  Loader2,
  BrainCircuit,
} from 'lucide-react'
import Logo from '../components/ui/Logo'
import { analysisService } from '../services/api'
import { processingSteps } from '../services/mockData'
import { cn } from '../utils/cn'

const STEP_ICONS = {
  upload: UploadCloud,
  stt: FileText,
  sentiment: Smile,
  confidence: Gauge,
  report: ClipboardCheck,
}

export default function Processing() {
  const navigate = useNavigate()
  const location = useLocation()
  const fileName = location.state?.fileName || 'interview-recording.mp4'

  const [progress, setProgress] = useState(0)
  const [activeStep, setActiveStep] = useState(0)
  const [done, setDone] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return // guard React StrictMode double-invoke
    started.current = true

    analysisService
      .processInterview({
        steps: processingSteps,
        onStep: setActiveStep,
        onProgress: setProgress,
      })
      .then(() => {
        setDone(true)
        setTimeout(() => navigate('/results/int_1042', { replace: true }), 1200)
      })
  }, [navigate])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-surface-2 px-4">
      {/* ambient background */}
      <div className="pointer-events-none absolute inset-0 bg-brand-radial" />
      <div className="pointer-events-none absolute left-1/3 top-1/4 h-72 w-72 rounded-full bg-primary/15 blur-3xl animate-float" />
      <div
        className="pointer-events-none absolute right-1/3 bottom-1/4 h-72 w-72 rounded-full bg-accent/15 blur-3xl animate-float"
        style={{ animationDelay: '2s' }}
      />

      <div className="absolute top-8">
        <Logo to={null} />
      </div>

      <div className="relative w-full max-w-lg">
        {/* AI brain indicator */}
        <div className="flex flex-col items-center text-center">
          <div className="relative grid place-items-center">
            <span className="absolute h-28 w-28 rounded-full bg-primary/30 animate-pulse-ring" />
            <span
              className="absolute h-28 w-28 rounded-full bg-secondary/20 animate-pulse-ring"
              style={{ animationDelay: '0.6s' }}
            />
            <motion.div
              animate={{ rotate: done ? 0 : 360 }}
              transition={
                done ? { duration: 0.4 } : { repeat: Infinity, duration: 8, ease: 'linear' }
              }
              className="relative grid h-24 w-24 place-items-center rounded-3xl bg-brand-gradient text-white shadow-glow"
            >
              <AnimatePresence mode="wait">
                {done ? (
                  <motion.span
                    key="done"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="grid place-items-center"
                  >
                    <Check className="h-12 w-12" strokeWidth={3} />
                  </motion.span>
                ) : (
                  <motion.span key="brain" exit={{ scale: 0 }}>
                    <BrainCircuit className="h-12 w-12" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          <h1 className="mt-8 text-2xl font-bold text-ink">
            {done ? 'Analysis complete!' : 'Analyzing your interview'}
          </h1>
          <p className="mt-2 max-w-sm truncate text-sm text-ink-muted">
            {done ? 'Redirecting to your results…' : fileName}
          </p>

          {/* progress percentage */}
          <div className="mt-6 w-full max-w-xs">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-ink-muted">Overall progress</span>
              <span className="font-bold text-primary">{progress}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-3">
              <motion.div
                className="h-full rounded-full bg-brand-gradient"
                animate={{ width: `${progress}%` }}
                transition={{ ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="mt-10 space-y-3">
          {processingSteps.map((step, i) => {
            const Icon = STEP_ICONS[step.key]
            const isDone = i < activeStep || done
            const isActive = i === activeStep && !done
            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className={cn(
                  'flex items-center gap-4 rounded-xl border p-3.5 transition-all duration-300',
                  isActive
                    ? 'border-primary/40 bg-primary/5 shadow-soft'
                    : isDone
                      ? 'border-line bg-surface'
                      : 'border-line bg-surface opacity-60',
                )}
              >
                <div
                  className={cn(
                    'grid h-10 w-10 shrink-0 place-items-center rounded-lg transition-colors',
                    isDone
                      ? 'bg-success/10 text-success'
                      : isActive
                        ? 'bg-primary/10 text-primary'
                        : 'bg-surface-3 text-ink-subtle',
                  )}
                >
                  {isDone ? (
                    <Check className="h-5 w-5" strokeWidth={3} />
                  ) : isActive ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn('text-sm font-semibold', isDone || isActive ? 'text-ink' : 'text-ink-muted')}>
                    {step.label}
                  </p>
                  <p className="truncate text-xs text-ink-subtle">{step.description}</p>
                </div>
                {isActive && (
                  <span className="text-xs font-semibold text-primary">Processing…</span>
                )}
                {isDone && <span className="text-xs font-semibold text-success">Done</span>}
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
