import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import express from 'express'

// config reads SIM_CONSOLE at import time.
process.env.SIM_CONSOLE = 'true'
const { simMiddleware, simRouter } = await import('../src/sim/faults.js')
const { metricsHandler, metricsMiddleware } = await import('../src/metrics.js')

function makeApp() {
  const app = express()
  app.use('/__sim', simRouter)
  app.use(metricsMiddleware)
  app.get('/metrics', metricsHandler)
  app.use(simMiddleware)
  app.get('/api/health', (req, res) => res.json({ ok: true }))
  app.get('/api/items', (req, res) => res.json([]))
  // Same shape as middleware/errors.js, without its log line.
  app.use((err, req, res, _next) => res.status(500).json({ error: 'Internal server error' }))
  return app
}

async function withServer(app, fn) {
  const server = app.listen(0)
  await new Promise((r) => server.once('listening', r))
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`)
  } finally {
    server.close()
  }
}

const post = (url, body) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

describe('failure simulation', () => {
  it('fails /api requests while the error fault is on, spares /api/health, and resets', async () => {
    await withServer(makeApp(), async (base) => {
      const state = await (await post(`${base}/__sim/state`, { errorRate: 1 })).json()
      assert.equal(state.errorRate, 1)

      assert.equal((await fetch(`${base}/api/items`)).status, 500)
      assert.equal((await fetch(`${base}/api/health`)).status, 200)

      await post(`${base}/__sim/reset`, {})
      assert.equal((await fetch(`${base}/api/items`)).status, 200)
    })
  })

  it('leaves no trace of the console in the request metrics', async () => {
    await withServer(makeApp(), async (base) => {
      await fetch(`${base}/__sim/state`)
      await post(`${base}/__sim/state`, { latencyMs: 0 })
      const text = await (await fetch(`${base}/metrics`)).text()
      assert.doesNotMatch(text, /__sim/)
    })
  })

  it('clamps values from the console', async () => {
    await withServer(makeApp(), async (base) => {
      const s = await (await post(`${base}/__sim/state`, { errorRate: 7, latencyMs: -5 })).json()
      assert.equal(s.errorRate, 1)
      assert.equal(s.latencyMs, 0)
      await post(`${base}/__sim/reset`, {})
    })
  })
})
