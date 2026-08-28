import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../prisma.js'
import { createUserWithOrg, findByEmail, getMemberships, toPublicUser } from '../db.js'
import {
  signAccessToken,
  issueRefreshToken,
  revokeRefreshCookie,
  rotateRefreshToken,
  requireAuth,
} from '../middleware/auth.js'
import { apiError, asyncHandler } from '../middleware/errors.js'
import { rateLimit } from '../middleware/rateLimit.js'
import { hashToken, randomToken, sendEmail } from '../services/email.js'
import { config } from '../config.js'

const router = Router()
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateCredentials(body) {
  const errors = {}
  if (!body?.name || String(body.name).trim().length < 2) errors.name = 'Full name is required'
  if (!body?.email || !EMAIL_RE.test(String(body.email))) errors.email = 'Enter a valid email address'
  if (!body?.password || String(body.password).length < 8) errors.password = 'Password must be at least 8 characters'
  return errors
}

async function sessionPayload(user, org, role, res) {
  await issueRefreshToken(res, { userId: user.id, orgId: org.id })
  const token = signAccessToken({ userId: user.id, orgId: org.id, role })
  return { user: toPublicUser(user, { org, membershipRole: role }), token }
}

router.post(
  '/register',
  rateLimit({ windowMs: 15 * 60_000, max: 10, key: (req) => req.ip }),
  asyncHandler(async (req, res) => {
    const errors = validateCredentials(req.body)
    if (Object.keys(errors).length) return apiError(res, 400, 'Validation failed', errors)
    if (await findByEmail(req.body.email)) {
      return apiError(res, 409, 'An account with this email already exists')
    }
    const { user, org, role } = await createUserWithOrg({
      name: req.body.name.trim(),
      email: req.body.email,
      password: req.body.password,
      orgName: req.body.orgName,
    })
    res.status(201).json(await sessionPayload(user, org, role, res))
  }),
)

router.post(
  '/login',
  rateLimit({ windowMs: 15 * 60_000, max: 20, key: (req) => req.ip }),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {}
    if (!email || !password) return apiError(res, 400, 'Email and password are required')
    const user = await findByEmail(email)
    const valid = user && bcrypt.compareSync(String(password), user.passwordHash)
    if (!valid) return apiError(res, 401, 'Invalid email or password')
    const memberships = await getMemberships(user.id)
    const membership = memberships[0]
    if (!membership) return apiError(res, 403, 'No organization membership')
    res.json(await sessionPayload(user, membership.org, membership.role, res))
  }),
)

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const row = await rotateRefreshToken(req, res)
    if (!row) return apiError(res, 401, 'Refresh token missing or expired')
    const user = await prisma.user.findUnique({ where: { id: row.userId } })
    const membership = await prisma.membership.findUnique({
      where: { userId_orgId: { userId: row.userId, orgId: row.orgId } },
      include: { org: true },
    })
    if (!user || !membership) return apiError(res, 401, 'Session is no longer valid')
    const token = signAccessToken({ userId: user.id, orgId: membership.orgId, role: membership.role })
    res.json({ user: toPublicUser(user, { org: membership.org, membershipRole: membership.role }), token })
  }),
)

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    await revokeRefreshCookie(req, res)
    res.json({ ok: true })
  }),
)

router.post(
  '/switch-org',
  requireAuth,
  asyncHandler(async (req, res) => {
    const orgId = req.body?.orgId
    const membership = await prisma.membership.findUnique({
      where: { userId_orgId: { userId: req.user.id, orgId } },
      include: { org: true },
    })
    if (!membership) return apiError(res, 404, 'Organization not found')
    await revokeRefreshCookie(req, res)
    res.json(await sessionPayload(req.user, membership.org, membership.role, res))
  }),
)

router.post(
  '/forgot-password',
  rateLimit({ windowMs: 15 * 60_000, max: 8, key: (req) => req.ip }),
  asyncHandler(async (req, res) => {
    const { email } = req.body || {}
    if (!email || !EMAIL_RE.test(String(email))) return apiError(res, 400, 'Enter a valid email address')
    const user = await findByEmail(email)
    if (user) {
      const token = randomToken()
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetTokenHash: hashToken(token),
          passwordResetExpires: new Date(Date.now() + 30 * 60 * 1000),
        },
      })
      const link = `${config.clientOrigin}/reset-password?token=${token}`
      await sendEmail({
        to: user.email,
        subject: 'Reset your IntervAI password',
        text: `Reset your password: ${link} (expires in 30 minutes)`,
        html: `<p>Reset your password:</p><p><a href="${link}">${link}</a></p><p>This link expires in 30 minutes.</p>`,
      })
    }
    res.json({ ok: true, message: `Reset link sent to ${email}` })
  }),
)

router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const { token, password } = req.body || {}
    if (!token || !password || String(password).length < 8) {
      return apiError(res, 400, 'A valid token and new password (8+ characters) are required')
    }
    const user = await prisma.user.findFirst({
      where: { passwordResetTokenHash: hashToken(token), passwordResetExpires: { gt: new Date() } },
    })
    if (!user) return apiError(res, 400, 'Reset link is invalid or expired')
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: bcrypt.hashSync(String(password), 10),
        passwordResetTokenHash: null,
        passwordResetExpires: null,
      },
    })
    res.json({ ok: true, message: 'Password updated' })
  }),
)

export default router
