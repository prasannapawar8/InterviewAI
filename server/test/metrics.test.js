import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import express from 'express'
import { metricsHandler, metricsMiddleware } from '../src/metrics.js'

async function withServer(app, fn) {
  const server = app.listen(0)
  await new Promise((r) => server.once('listening', r))
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`)
  } finally {
    server.close()
  }
}

describe('metrics', () => {
  it('counts requests by route pattern and status, with a latency histogram', async () => {
    const app = express()
    app.use(metricsMiddleware)
    app.get('/metrics', metricsHandler)
    app.get('/api/items/:id', (req, res) => res.json({ id: req.params.id }))
    app.get('/api/boom', (req, res) => res.status(500).end())

    const text = await withServer(app, async (base) => {
      await fetch(`${base}/api/items/1`)
      await fetch(`${base}/api/items/2`)
      await fetch(`${base}/api/boom`)
      await fetch(`${base}/metrics`)
      return (await fetch(`${base}/metrics`)).text()
    })

    // Ids collapse into the route pattern; /metrics itself is not counted.
    assert.match(text, /http_server_requests_total\{method="GET",route="\/api\/items\/:id",status="200"\} 2/)
    assert.match(text, /http_server_requests_total\{method="GET",route="\/api\/boom",status="500"\} 1/)
    assert.doesNotMatch(text, /route="\/metrics"/)
    assert.match(text, /http_server_request_duration_seconds_bucket\{method="GET",route="\/api\/boom",status="500",le="\+Inf"\} 1/)
    assert.match(text, /http_server_request_duration_seconds_count\{method="GET",route="\/api\/items\/:id",status="200"\} 2/)
  })
})
