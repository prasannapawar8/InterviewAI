/** Wrap async route handlers so rejections reach the error middleware. */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

/** Small helper for consistent API errors. */
export function apiError(res, status, message, details) {
  return res.status(status).json({ error: message, ...(details ? { details } : {}) })
}

/** Centralized error handler — last middleware in the chain. */
export function errorHandler(err, req, res, _next) {
  if (err && err.name === 'MulterError') {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 500MB)' : err.message
    return res.status(400).json({ error: msg })
  }
  if (err && err.status) {
    return res.status(err.status).json({ error: err.message, ...(err.code ? { code: err.code } : {}) })
  }
  console.error(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: 'error',
      msg: 'unhandled',
      error: err?.message,
      requestId: req.requestId,
    }),
  )
  return res.status(500).json({ error: 'Internal server error', requestId: req.requestId })
}

/** 404 for unknown API routes. */
export function notFound(req, res) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` })
}
