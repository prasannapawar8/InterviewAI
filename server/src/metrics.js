/**
 * Minimal Prometheus metrics for the API (RED: rate, errors, duration), in the text exposition
 * format. Scraped from GET /metrics by the in-cluster Prometheus; not routed through /api, so the
 * web tier never exposes it publicly.
 */

const BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]

// key = JSON of the label set -> { labels, count, sum, buckets[] }
const requests = new Map()

function labelKey(labels) {
  return JSON.stringify([labels.method, labels.route, labels.status])
}

function fmtLabels(labels, extra = {}) {
  const all = { ...labels, ...extra }
  const parts = Object.entries(all).map(([k, v]) => `${k}="${String(v).replace(/["\\\n]/g, '_')}"`)
  return `{${parts.join(',')}}`
}

function observe(labels, seconds) {
  const key = labelKey(labels)
  let s = requests.get(key)
  if (!s) {
    s = { labels, count: 0, sum: 0, buckets: BUCKETS.map(() => 0) }
    requests.set(key, s)
  }
  s.count += 1
  s.sum += seconds
  BUCKETS.forEach((le, i) => {
    if (seconds <= le) s.buckets[i] += 1
  })
}

/** Express middleware: times every request and records it once the response is sent. */
export function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint()
  res.on('finish', () => {
    // Use the matched route pattern (not the raw URL) so ids do not explode label cardinality.
    const route = req.route ? `${req.baseUrl}${req.route.path}` : 'unmatched'
    if (route === '/metrics') return
    const seconds = Number(process.hrtime.bigint() - start) / 1e9
    observe({ method: req.method, route, status: res.statusCode }, seconds)
  })
  next()
}

/** GET /metrics handler. */
export function metricsHandler(req, res) {
  const lines = []
  lines.push('# HELP http_server_requests_total HTTP requests handled by the API.')
  lines.push('# TYPE http_server_requests_total counter')
  for (const s of requests.values()) {
    lines.push(`http_server_requests_total${fmtLabels(s.labels)} ${s.count}`)
  }
  lines.push('# HELP http_server_request_duration_seconds HTTP request latency.')
  lines.push('# TYPE http_server_request_duration_seconds histogram')
  for (const s of requests.values()) {
    BUCKETS.forEach((le, i) => {
      lines.push(`http_server_request_duration_seconds_bucket${fmtLabels(s.labels, { le })} ${s.buckets[i]}`)
    })
    lines.push(`http_server_request_duration_seconds_bucket${fmtLabels(s.labels, { le: '+Inf' })} ${s.count}`)
    lines.push(`http_server_request_duration_seconds_sum${fmtLabels(s.labels)} ${s.sum}`)
    lines.push(`http_server_request_duration_seconds_count${fmtLabels(s.labels)} ${s.count}`)
  }
  const mem = process.memoryUsage()
  lines.push('# HELP process_resident_memory_bytes Resident set size of the API process.')
  lines.push('# TYPE process_resident_memory_bytes gauge')
  lines.push(`process_resident_memory_bytes ${mem.rss}`)
  res.set('Content-Type', 'text/plain; version=0.0.4')
  res.send(lines.join('\n') + '\n')
}
