/**
 * Failure simulation for demos of the selfheal agent (SIM_CONSOLE=true only; off by default).
 *
 * Faults run inside the API as ordinary runtime behaviour, so a monitoring system sees only their
 * symptoms: 5xx responses, slow responses, memory growth until the container is OOMKilled, or a
 * process that fails on start. The control endpoints themselves leave no trace: they are mounted
 * ahead of the request metrics, write no log lines, and nginx serves them with access_log off.
 *
 * Error and latency faults live in memory, so replacing or restarting the process clears them. The
 * memory leak and the crash are persisted under DATA_DIR (an emptyDir in Kubernetes): like real
 * defects they come back after a container restart, and only a new pod clears them.
 */
import fs from 'node:fs'
import path from 'node:path'
import { Router } from 'express'
import express from 'express'
import { config } from '../config.js'

const STATE_FILE = () => path.join(config.dataDir, '.sim-state.json')
const LEAK_TICK_MS = 2000

// Messages the API would plausibly log when its database connections fail.
const DB_ERRORS = [
  'Connection terminated unexpectedly',
  'Timed out fetching a new connection from the connection pool',
  'read ECONNRESET',
  "Can't reach database server at `postgres:5432`",
]
// What a bad data migration looks like when the API starts.
const BOOT_ERROR = "Cannot read properties of undefined (reading 'competencies')"

const state = {
  errorRate: 0, // fraction of /api requests (except /api/health) answered with a 500
  latencyMs: 0, // extra delay on /api requests (except /api/health)
  leakMbPerTick: 0, // memory retained every LEAK_TICK_MS; 0 = off
  crash: false,
}
let leaked = []
let leakTimer = null

export const simEnabled = () => config.simConsole

function persist() {
  const durable = { leakMbPerTick: state.leakMbPerTick, crash: state.crash }
  try {
    if (!durable.leakMbPerTick && !durable.crash) fs.rmSync(STATE_FILE(), { force: true })
    else fs.writeFileSync(STATE_FILE(), JSON.stringify(durable))
  } catch {
    /* best effort: a lost file only means the fault does not survive a restart */
  }
}

function startLeak() {
  stopLeak()
  if (!state.leakMbPerTick) return
  leakTimer = setInterval(() => {
    // Filled, so the pages are really resident (RSS), not just reserved.
    leaked.push(Buffer.alloc(state.leakMbPerTick * 1024 * 1024, 1))
  }, LEAK_TICK_MS)
}

function stopLeak() {
  if (leakTimer) clearInterval(leakTimer)
  leakTimer = null
  leaked = []
}

function snapshot() {
  return {
    enabled: true,
    errorRate: state.errorRate,
    latencyMs: state.latencyMs,
    leakMbPerTick: state.leakMbPerTick,
    leakedMb: leaked.reduce((n, b) => n + b.length, 0) / (1024 * 1024),
    crash: state.crash,
    rssMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
    uptimeS: Math.round(process.uptime()),
  }
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Number(v) || 0))

/** Called first in boot(): resume a persisted leak, or fail like a broken release would. */
export async function simOnBoot() {
  if (!simEnabled()) return
  let durable = {}
  try {
    durable = JSON.parse(fs.readFileSync(STATE_FILE(), 'utf8'))
  } catch {
    return
  }
  state.leakMbPerTick = clamp(durable.leakMbPerTick, 0, 64)
  state.crash = Boolean(durable.crash)
  if (state.crash) throw new TypeError(BOOT_ERROR) // logged by index.js as "boot failed"
  startLeak()
}

/** Request middleware: injects the active error and latency faults into /api traffic. */
export function simMiddleware(req, res, next) {
  if (!simEnabled() || !req.path.startsWith('/api/') || req.path === '/api/health') return next()
  const go = () => {
    if (state.errorRate > 0 && Math.random() < state.errorRate) {
      next(new Error(DB_ERRORS[Math.floor(Math.random() * DB_ERRORS.length)]))
    } else {
      next()
    }
  }
  if (state.latencyMs > 0) setTimeout(go, state.latencyMs * (0.8 + Math.random() * 0.4))
  else go()
}

/** Control API for the console (mounted at /__sim). Writes no logs and records no metrics. */
export const simRouter = Router()
simRouter.use(express.json({ limit: '16kb' }))

simRouter.get('/state', (req, res) => res.json(snapshot()))

simRouter.post('/state', (req, res) => {
  const b = req.body || {}
  if ('errorRate' in b) state.errorRate = clamp(b.errorRate, 0, 1)
  if ('latencyMs' in b) state.latencyMs = clamp(b.latencyMs, 0, 10000)
  if ('leakMbPerTick' in b) {
    state.leakMbPerTick = clamp(b.leakMbPerTick, 0, 64)
    startLeak()
  }
  if (b.crash === true) state.crash = true
  persist()
  res.json(snapshot())
  if (state.crash) {
    // Exit once the response is out; the restart then fails in simOnBoot until the pod is replaced.
    res.on('finish', () => setTimeout(() => process.exit(1), 200))
  }
})

simRouter.post('/reset', (req, res) => {
  state.errorRate = 0
  state.latencyMs = 0
  state.leakMbPerTick = 0
  state.crash = false
  stopLeak()
  persist()
  res.json(snapshot())
})
