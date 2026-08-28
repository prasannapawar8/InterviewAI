import jwt from 'jsonwebtoken'
import { config } from '../config.js'

const SHARE_DAYS = 7

export function signShareToken(analysisId) {
  return jwt.sign({ typ: 'share', aid: analysisId }, config.jwtSecret, { expiresIn: `${SHARE_DAYS}d` })
}

export function verifyShareToken(token) {
  const payload = jwt.verify(token, config.jwtSecret)
  if (payload.typ !== 'share' || !payload.aid) {
    const err = new Error('Invalid share link')
    err.status = 400
    throw err
  }
  return { analysisId: payload.aid, exp: payload.exp }
}

export function shareExpiryIso(token) {
  const { exp } = jwt.decode(token) || {}
  return exp ? new Date(exp * 1000).toISOString() : null
}
