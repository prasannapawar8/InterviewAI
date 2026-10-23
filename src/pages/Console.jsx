import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  Bug,
  Clock,
  Copy,
  Cpu,
  History,
  PackageX,
  Power,
  RotateCcw,
  Trash2,
  Zap,
} from 'lucide-react'
import Logo from '../components/ui/Logo'
import ThemeToggle from '../components/ui/ThemeToggle'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { Card, CardHeader } from '../components/ui/Card'
import { useToast } from '../context/ToastContext'

// Failure simulation console for selfheal demos. Reachable at /console when the API runs with
// SIM_CONSOLE=true; not linked from the app. It talks to /__sim directly (no auth, no /api
// prefix), so it keeps working while the app itself is failing.

const SIM = '/__sim'
const HISTORY_KEY = 'intervai.console.history'
const POLL_MS = 2000

const LEAK_RATES = [
  { label: 'Slow', mb: 4, hint: '~2 MB/s · OOM in about 4 min' },
  { label: 'Fast', mb: 16, hint: '~8 MB/s · OOM in about 1 min' },
]

const BAD_RELEASE_CMD =
  'helm upgrade interviewai deploy/helm/interviewai -n interviewai --reuse-values --set api.tag=0.3.0-broken'

// Presenter's record of what was injected and when. Browser storage only: it is never sent to the
// API, written to a log, or visible to the agent.
function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

function saveHistory(items) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 50)))
  } catch {
    /* storage unavailable: history lives for this page only */
  }
}

async function sim(path, body) {
  const res = await fetch(`${SIM}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(4000),
  })
  if (res.status === 404) {
    const err = new Error('disabled')
    err.disabled = true
    throw err
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function useApiHealth() {
  const [health, setHealth] = useState({ status: 'unknown', ms: null })
  useEffect(() => {
    let alive = true
    const check = async () => {
      const t0 = performance.now()
      try {
        const res = await fetch('/api/health', { signal: AbortSignal.timeout(3000) })
        const ms = Math.round(performance.now() - t0)
        if (alive) setHealth({ status: res.ok ? 'up' : 'degraded', ms })
      } catch {
        if (alive) setHealth({ status: 'down', ms: null })
      }
    }
    check()
    const id = setInterval(check, POLL_MS)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])
  return health
}

function Stat({ icon: Icon, label, value, tone = 'text-ink' }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-surface-2 px-4 py-3">
      <Icon className="h-5 w-5 text-ink-subtle" />
      <div className="min-w-0">
        <p className="text-xs text-ink-muted">{label}</p>
        <p className={`text-sm font-semibold ${tone}`}>{value}</p>
      </div>
    </div>
  )
}

function Slider({ value, min, max, step, onChange, format }) {
  return (
    <div className="mt-4">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[rgb(79,70,229)]"
      />
      <div className="mt-1 flex justify-between text-xs text-ink-subtle">
        <span>{format(min)}</span>
        <span className="font-semibold text-ink">{format(value)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  )
}

function FaultCard({ icon: Icon, title, subtitle, active, children }) {
  return (
    <Card className={active ? 'ring-2 ring-danger/40' : ''}>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" /> {title}
          </span>
        }
        subtitle={subtitle}
        action={active ? <Badge variant="danger" dot>Active</Badge> : <Badge>Off</Badge>}
      />
      {children}
    </Card>
  )
}

export default function Console() {
  const toast = useToast()
  const health = useApiHealth()
  const [state, setState] = useState(null)
  const [reachable, setReachable] = useState(true)
  const [disabled, setDisabled] = useState(false)
  const [errorRate, setErrorRate] = useState(0.5)
  const [latencyMs, setLatencyMs] = useState(1500)
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState(loadHistory)

  const record = useCallback((what) => {
    setHistory((h) => {
      const next = [{ at: new Date().toISOString(), what }, ...h]
      saveHistory(next)
      return next
    })
  }, [])

  const refresh = useCallback(async () => {
    try {
      setState(await sim('/state'))
      setReachable(true)
      setDisabled(false)
    } catch (err) {
      if (err.disabled) setDisabled(true)
      setReachable(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, POLL_MS)
    return () => clearInterval(id)
  }, [refresh])

  const apply = async (body, what) => {
    setBusy(true)
    try {
      setState(await sim('/state', body))
      record(what)
      toast.success('Applied', what)
    } catch (err) {
      toast.error('Could not reach the API', err.message)
    } finally {
      setBusy(false)
    }
  }

  const restore = async () => {
    setBusy(true)
    try {
      setState(await sim('/reset', {}))
      record('Restored: all simulated faults cleared')
      toast.success('Restored', 'All simulated faults cleared.')
    } catch (err) {
      toast.error('Could not reach the API', err.message)
    } finally {
      setBusy(false)
    }
  }

  const copy = async (text, what) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied', what)
    } catch {
      toast.error('Copy failed', 'Select the command and copy it manually.')
    }
  }

  const errorsOn = (state?.errorRate ?? 0) > 0
  const latencyOn = (state?.latencyMs ?? 0) > 0
  const leakOn = (state?.leakMbPerTick ?? 0) > 0
  const apiTone = { up: 'text-success', degraded: 'text-warning', down: 'text-danger' }[health.status] || 'text-ink'

  return (
    <div className="min-h-screen bg-surface-2">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo to="/console" />
            <Badge variant="warning">Simulation console</Badge>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-ink">Failure simulation</h1>
              <p className="mt-1 max-w-2xl text-sm text-ink-muted">
                Make the running API fail the way real defects do. Monitoring sees only the symptoms; the
                controls on this page are not logged or measured by the app.
              </p>
            </div>
            <Button variant="success" onClick={restore} loading={busy} disabled={!reachable}>
              <RotateCcw className="h-4 w-4" /> Restore all
            </Button>
          </div>

          {disabled && (
            <Card className="mt-6 border border-warning/40">
              <p className="flex items-center gap-2 text-sm font-semibold text-warning">
                <AlertTriangle className="h-4 w-4" /> The console is disabled on this API
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                Set <code>SIM_CONSOLE=true</code> on the API (the kind chart does this) and reload.
              </p>
            </Card>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              icon={Activity}
              label="API health"
              value={health.status === 'up' ? `Up · ${health.ms} ms` : health.status}
              tone={apiTone}
            />
            <Stat icon={Cpu} label="API memory (RSS)" value={state ? `${state.rssMb} MB` : '—'} />
            <Stat icon={Clock} label="API uptime" value={state ? `${state.uptimeS} s` : '—'} />
            <Stat
              icon={Power}
              label="Console link"
              value={reachable ? 'Connected' : disabled ? 'Disabled' : 'API unreachable'}
              tone={reachable ? 'text-success' : 'text-danger'}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <FaultCard
              icon={Zap}
              title="Error spike"
              subtitle="A share of API requests fail with database connection errors (HTTP 500)."
              active={errorsOn}
            >
              <Slider
                value={errorRate}
                min={0.1}
                max={0.9}
                step={0.1}
                onChange={setErrorRate}
                format={(v) => `${Math.round(v * 100)} %`}
              />
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="danger" disabled={!reachable || busy}
                  onClick={() => apply({ errorRate }, `Error spike: ${Math.round(errorRate * 100)} % of requests fail`)}>
                  Inject
                </Button>
                <Button size="sm" variant="outline" disabled={!reachable || busy || !errorsOn}
                  onClick={() => apply({ errorRate: 0 }, 'Error spike stopped')}>
                  Stop
                </Button>
              </div>
            </FaultCard>

            <FaultCard
              icon={Clock}
              title="Slow responses"
              subtitle="API requests take longer, as with a slow query or a saturated dependency."
              active={latencyOn}
            >
              <Slider
                value={latencyMs}
                min={250}
                max={5000}
                step={250}
                onChange={setLatencyMs}
                format={(v) => `${v} ms`}
              />
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="danger" disabled={!reachable || busy}
                  onClick={() => apply({ latencyMs }, `Slow responses: +${latencyMs} ms`)}>
                  Inject
                </Button>
                <Button size="sm" variant="outline" disabled={!reachable || busy || !latencyOn}
                  onClick={() => apply({ latencyMs: 0 }, 'Slow responses stopped')}>
                  Stop
                </Button>
              </div>
            </FaultCard>

            <FaultCard
              icon={Cpu}
              title="Memory leak"
              subtitle="Memory grows until the container is OOMKilled, and the leak returns after each restart."
              active={leakOn}
            >
              {leakOn && state && (
                <p className="mt-2 text-sm text-ink-muted">
                  Leaked so far: <span className="font-semibold text-ink">{Math.round(state.leakedMb)} MB</span>
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {LEAK_RATES.map((r) => (
                  <Button key={r.label} size="sm" variant="danger" disabled={!reachable || busy} title={r.hint}
                    onClick={() => apply({ leakMbPerTick: r.mb }, `Memory leak (${r.label.toLowerCase()}): ${r.hint}`)}>
                    {r.label} leak
                  </Button>
                ))}
                <Button size="sm" variant="outline" disabled={!reachable || busy || !leakOn}
                  onClick={() => apply({ leakMbPerTick: 0 }, 'Memory leak stopped')}>
                  Stop
                </Button>
              </div>
            </FaultCard>

            <FaultCard
              icon={Bug}
              title="Crash on start"
              subtitle="The API exits and then fails on every restart (CrashLoopBackOff) until the pod is replaced."
              active={Boolean(state?.crash)}
            >
              <p className="mt-2 text-sm text-ink-muted">
                The console goes offline with the API. To clear it by hand:{' '}
                <code className="text-xs">kubectl rollout restart deploy/api -n interviewai</code>
              </p>
              <div className="mt-4">
                <Button size="sm" variant="danger" disabled={!reachable || busy}
                  onClick={() => {
                    if (window.confirm('Crash the API? It will stay down until the pod is replaced.')) {
                      apply({ crash: true }, 'Crash on start: API exits and crash-loops')
                    }
                  }}>
                  Crash the API
                </Button>
              </div>
            </FaultCard>

            <FaultCard
              icon={PackageX}
              title="Bad release"
              subtitle="Deploy an API image that does not exist. Runs from a terminal, since it changes the release."
              active={false}
            >
              <pre className="mt-2 overflow-x-auto rounded-lg bg-surface-2 p-3 text-xs text-ink">{BAD_RELEASE_CMD}</pre>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => copy(BAD_RELEASE_CMD, 'Run it from the InterviewAI folder.')}>
                  <Copy className="h-4 w-4" /> Copy command
                </Button>
                <Button size="sm" variant="ghost" onClick={() => record('Bad release: api.tag=0.3.0-broken (from terminal)')}>
                  Note in history
                </Button>
              </div>
            </FaultCard>

            <Card>
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" /> Injection history
                  </span>
                }
                subtitle="Kept in this browser only, to compare with when the agent reacted."
                action={
                  <Button size="sm" variant="ghost" disabled={!history.length}
                    onClick={() => { setHistory([]); saveHistory([]) }}>
                    <Trash2 className="h-4 w-4" /> Clear
                  </Button>
                }
              />
              {history.length === 0 ? (
                <p className="text-sm text-ink-muted">Nothing injected yet.</p>
              ) : (
                <ul className="max-h-64 space-y-2 overflow-y-auto">
                  {history.map((h) => (
                    <li key={h.at + h.what} className="flex gap-3 text-sm">
                      <span className="shrink-0 font-mono text-xs text-ink-subtle">
                        {new Date(h.at).toLocaleTimeString()}
                      </span>
                      <span className="text-ink">{h.what}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
