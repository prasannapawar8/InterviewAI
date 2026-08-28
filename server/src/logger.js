const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 }

function emit(level, msg, extra) {
  const rec = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(extra && typeof extra === 'object' ? extra : extra ? { extra } : {}),
  }
  const line = JSON.stringify(rec)
  if (level === 'error') console.error(line)
  else console.log(line)
}

export const logger = {
  error: (msg, extra) => emit('error', msg, extra),
  warn: (msg, extra) => emit('warn', msg, extra),
  info: (msg, extra) => emit('info', msg, extra),
  debug: (msg, extra) => {
    if ((LEVELS[process.env.LOG_LEVEL || 'info'] ?? 2) >= 3) emit('debug', msg, extra)
  },
}
