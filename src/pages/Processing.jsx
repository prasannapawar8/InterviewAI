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
  const analysisId = location.state?.analysisId
  const fileName = location.state?.fileName || 'interview-recording.mp4'

  const [progress, setProgress] = useState(0)
  const [activeStep, setActiveStep] = useState(0)
  const [done, setDone] = useState(false)
  const [failed, setFailed] = useState(false)
  const [failMessage, setFailMessage] = useState('')
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return // guard React StrictMode double-invoke
    started.current = true

    analysisService
      .processInterview({
        analysisId,
        steps: processingSteps,
        onStep: setActiveStep,
        onProgress: setProgress,
      })
      .then((res) => {
        setDone(true)
        setTimeout(() => navigate(`/results/${res.resultId}`, { replace: true }), 1200)
      })
      .catch((err) => {
        setFailMessage(err.message || '')
        setFailed(true)
      })
  }, [analysisId, navigate])

  return (
    <div className="relative min-h-screen overflow-y-auto bg-surface-2">
      {/* ambient background — clipped so blobs never cover copy */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-brand-radial" />
        <div className="absolute left-1/3 top-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-full w-full max-w-lg flex-col px-4 py-10 sm:py-14">
        <div className="mb-8 flex justify-center">
          <Logo to={null} />
        </div>

        <div className="flex flex-col items-center text-center">
          {/* Reserved well so pulse-rings cannot overlap the heading */}
          <div className="relative grid h-44 w-44 shrink-0 place-items-center overflow-hidden">
            <span aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
              <span className="h-24 w-24 rounded-full bg-primary/30 animate-pulse-ring" />
            </span>
            <span aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
              <span
                className="h-24 w-24 rounded-full bg-secondary/20 animate-pulse-ring"
                style={{ animationDelay: '0.6s' }}
              />
            </span>
            <motion.div
              animate={{ rotate: done ? 0 : 360 }}
              transition={
                done ? { duration: 0.4 } : { repeat: Infinity, duration: 8, ease: 'linear' }
              }
              className="relative z-10 grid h-24 w-24 place-items-center rounded-3xl bg-brand-gradient text-white shadow-glow"
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

          <h1 className="mt-2 text-2xl font-bold leading-tight text-ink">
            {failed
              ? 'Something went wrong'
              : done
                ? 'Analysis complete!'
                : 'Analyzing your interview'}
          </h1>
          <p className="mt-2 max-w-sm break-all text-sm leading-relaxed text-ink-muted">
            {failed
              ? failMessage || 'The pipeline could not complete. You can retry this analysis.'
              : done
                ? 'Redirecting to your results…'
                : fileName}
          </p>
          {failed && (
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                className="rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-glow"
                onClick={async () => {
                  try {
                    setFailed(false)
                    setFailMessage('')
                    setDone(false)
                    setProgress(0)
                    setActiveStep(0)
                    await analysisService.retry(analysisId)
                    const res = await analysisService.processInterview({
                      analysisId,
                      steps: processingSteps,
                      onStep: setActiveStep,
                      onProgress: setProgress,
                    })
                    setDone(true)
                    setTimeout(() => navigate(`/results/${res.resultId}`, { replace: true }), 1200)
                  } catch (err) {
                    setFailMessage(err.message || '')
                    setFailed(true)
                  }
                }}
              >
                Retry analysis
              </button>
              <button
                type="button"
                className="rounded-xl border border-line px-5 py-2.5 text-sm font-semibold text-ink"
                onClick={() => navigate('/upload')}
              >
                Upload another file
              </button>
            </div>
          )}

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
                  <span className="shrink-0 text-xs font-semibold text-primary">Processing…</span>
                )}
                {isDone && <span className="shrink-0 text-xs font-semibold text-success">Done</span>}
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
