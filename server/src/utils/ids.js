import crypto from 'node:crypto'

/** Monotonic-ish unique id with a readable prefix, e.g. `int_10a3b` */
export function newId(prefix) {
  const rand = crypto.randomBytes(3).toString('hex')
  return `${prefix}_${rand}`
}

/** Stable 32-bit hash of a string (FNV-1a) — used to seed the analysis engine */
export function hashString(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Seconds → "MM:SS" (or "H:MM:SS" past an hour) */
export function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(sec).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}
