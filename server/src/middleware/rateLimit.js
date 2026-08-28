const windows = new Map()

function prune(bucket, now, windowMs) {
  while (bucket.length && bucket[0] <= now - windowMs) bucket.shift()
}

/**
 * In-memory sliding window. Fine for a single API instance; use Redis in a multi-node deploy.
 */
export function rateLimit({ windowMs = 60_000, max = 30, key = (req) => req.ip } = {}) {
  return (req, res, next) => {
    const id = `${req.path}:${key(req)}`
    const now = Date.now()
    if (!windows.has(id)) windows.set(id, [])
    const bucket = windows.get(id)
    prune(bucket, now, windowMs)
    if (bucket.length >= max) {
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000))
      return res.status(429).json({ error: 'Too many requests — please slow down' })
    }
    bucket.push(now)
    next()
  }
}
