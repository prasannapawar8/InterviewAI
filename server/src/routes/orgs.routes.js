import { Router } from 'express'
import { prisma } from '../prisma.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { apiError, asyncHandler } from '../middleware/errors.js'
import { hashToken, randomToken, sendEmail } from '../services/email.js'
import { newId } from '../utils/ids.js'
import { config } from '../config.js'
import { getBillingSnapshot } from '../services/usage.service.js'

const router = Router()
router.use(requireAuth)

router.get('/me', asyncHandler(async (req, res) => {
  const members = await prisma.membership.findMany({
    where: { orgId: req.orgId },
    include: { user: true },
  })
  const billing = await getBillingSnapshot(req.org)
  res.json({
    org: {
      id: req.org.id,
      name: req.org.name,
      slug: req.org.slug,
      plan: req.org.plan,
      minutesQuota: req.org.minutesQuota,
    },
    billing,
    members: members.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
    })),
    role: req.membershipRole,
  })
}))

router.patch('/me', requireAdmin, asyncHandler(async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  if (name.length < 2) return apiError(res, 400, 'Organization name is required')
  const org = await prisma.organization.update({ where: { id: req.orgId }, data: { name } })
  res.json({ org: { id: org.id, name: org.name, slug: org.slug, plan: org.plan } })
}))

router.get('/me/invites', requireAdmin, asyncHandler(async (req, res) => {
  const invites = await prisma.invite.findMany({
    where: { orgId: req.orgId },
    orderBy: { expiresAt: 'desc' },
  })
  res.json({
    invites: invites.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      expiresAt: i.expiresAt,
    })),
  })
}))

router.post('/me/invites', requireAdmin, asyncHandler(async (req, res) => {
  const email = String(req.body?.email || '').toLowerCase().trim()
  const role = req.body?.role || 'recruiter'
  if (!email.includes('@')) return apiError(res, 400, 'Enter a valid email address')
  if (!['admin', 'recruiter', 'viewer'].includes(role)) return apiError(res, 400, 'Invalid role')

  const token = randomToken()
  const invite = await prisma.invite.create({
    data: {
      id: newId('inv'),
      orgId: req.orgId,
      email,
      role,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      invitedById: req.user.id,
    },
  })
  const link = `${config.clientOrigin}/invite/${token}`
  await sendEmail({
    to: email,
    subject: `Join ${req.org.name} on IntervAI`,
    text: `You were invited to ${req.org.name} as ${role}. Accept: ${link}`,
    html: `<p>You were invited to <strong>${req.org.name}</strong> as ${role}.</p><p><a href="${link}">Accept invite</a></p>`,
  })
  res.status(201).json({ id: invite.id, email, role, acceptUrl: config.isProd ? undefined : link })
}))

router.post('/invites/accept', asyncHandler(async (req, res) => {
  const token = req.body?.token
  if (!token) return apiError(res, 400, 'Invite token is required')
  const invite = await prisma.invite.findUnique({ where: { tokenHash: hashToken(token) } })
  if (!invite || invite.expiresAt < new Date()) return apiError(res, 400, 'Invite is invalid or expired')
  if (invite.email !== req.user.email.toLowerCase()) {
    return apiError(res, 403, 'This invite was sent to a different email address')
  }
  await prisma.membership.upsert({
    where: { userId_orgId: { userId: req.user.id, orgId: invite.orgId } },
    update: { role: invite.role },
    create: { id: newId('mem'), userId: req.user.id, orgId: invite.orgId, role: invite.role },
  })
  await prisma.invite.delete({ where: { id: invite.id } })
  res.json({ ok: true, orgId: invite.orgId })
}))

export default router
