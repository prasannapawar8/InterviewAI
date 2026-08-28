import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { prisma } from '../prisma.js'
import { hashToken, randomToken } from '../services/email.js'
import { newId } from '../utils/ids.js'
import { apiError } from './errors.js'

export function signAccessToken({ userId, orgId, role }) {
  return jwt.sign({ sub: userId, orgId, role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn })
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSecure ? 'none' : 'lax',
    path: '/api/auth',
    maxAge: config.refreshExpiresDays * 24 * 60 * 60 * 1000,
  }
}

export async function issueRefreshToken(res, { userId, orgId }) {
  const token = randomToken()
  await prisma.refreshToken.create({
    data: {
      id: newId('rtk'),
      userId,
      orgId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + config.refreshExpiresDays * 24 * 60 * 60 * 1000),
    },
  })
  res.cookie(config.refreshCookieName, token, cookieOptions())
  return token
}

export async function revokeRefreshCookie(req, res) {
  const raw = req.cookies?.[config.refreshCookieName]
  if (raw) {
    await prisma.refreshToken.deleteMany({ where: { tokenHash: hashToken(raw) } })
  }
  res.clearCookie(config.refreshCookieName, { ...cookieOptions(), maxAge: 0 })
}

export async function rotateRefreshToken(req, res) {
  const raw = req.cookies?.[config.refreshCookieName]
  if (!raw) return null
  const row = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(raw) } })
  if (!row || row.expiresAt < new Date()) {
    if (row) await prisma.refreshToken.delete({ where: { id: row.id } }).catch(() => {})
    return null
  }
  await prisma.refreshToken.delete({ where: { id: row.id } })
  await issueRefreshToken(res, { userId: row.userId, orgId: row.orgId })
  return row
}

/**
 * Requires Authorization Bearer access token. Attaches req.user, req.org, req.membershipRole.
 */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return apiError(res, 401, 'Authentication required')
  try {
    const payload = jwt.verify(token, config.jwtSecret)
    const user = await prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user) return apiError(res, 401, 'Account no longer exists')

    let orgId = payload.orgId
    let membership = orgId
      ? await prisma.membership.findUnique({
          where: { userId_orgId: { userId: user.id, orgId } },
          include: { org: true },
        })
      : null
    if (!membership) {
      membership = await prisma.membership.findFirst({ where: { userId: user.id }, include: { org: true } })
    }
    if (!membership) return apiError(res, 403, 'No organization membership')

    req.user = user
    req.org = membership.org
    req.membershipRole = membership.role
    req.orgId = membership.org.id
    next()
  } catch {
    return apiError(res, 401, 'Invalid or expired token')
  }
}

const ROLE_RANK = { viewer: 1, recruiter: 2, admin: 3, owner: 4 }

export function requireRole(...roles) {
  const min = Math.min(...roles.map((r) => ROLE_RANK[r] || 99))
  return (req, res, next) => {
    const rank = ROLE_RANK[req.membershipRole] || 0
    if (rank < min) return apiError(res, 403, 'You do not have permission to do that')
    next()
  }
}

/** Recruiter and above can upload; viewers cannot. */
export function requireRecruiter(req, res, next) {
  if (!['owner', 'admin', 'recruiter'].includes(req.membershipRole)) {
    return apiError(res, 403, 'Viewers cannot upload or start analyses')
  }
  next()
}

export function requireAdmin(req, res, next) {
  if (!['owner', 'admin'].includes(req.membershipRole)) {
    return apiError(res, 403, 'Admin access required')
  }
  next()
}
