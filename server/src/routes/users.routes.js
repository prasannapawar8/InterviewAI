import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../prisma.js'
import { getMemberships, toPublicUser } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { apiError, asyncHandler } from '../middleware/errors.js'

const router = Router()
router.use(requireAuth)

router.get('/me', asyncHandler(async (req, res) => {
  const memberships = await getMemberships(req.user.id)
  res.json({
    user: toPublicUser(req.user, { org: req.org, membershipRole: req.membershipRole }),
    memberships: memberships.map((m) => ({
      orgId: m.orgId,
      role: m.role,
      name: m.org.name,
      plan: m.org.plan,
    })),
  })
}))

router.patch('/me', asyncHandler(async (req, res) => {
  const { name, role, company, avatar, preferences } = req.body || {}
  const data = {}
  if (typeof name === 'string' && name.trim()) data.name = name.trim()
  if (typeof role === 'string') data.jobTitle = role.trim()
  if (typeof company === 'string') data.company = company.trim()
  if (typeof avatar === 'string' || avatar === null) data.avatar = avatar
  if (preferences && typeof preferences === 'object') data.preferences = preferences
  const user = await prisma.user.update({ where: { id: req.user.id }, data })
  res.json({ user: toPublicUser(user, { org: req.org, membershipRole: req.membershipRole }) })
}))

router.post(
  '/me/password',
  asyncHandler(async (req, res) => {
    const { current, next } = req.body || {}
    if (!current || !next) return apiError(res, 400, 'Current and new password are required')
    if (String(next).length < 8) return apiError(res, 400, 'New password must be at least 8 characters')
    if (current === next) return apiError(res, 400, 'New password must differ from the current one')
    const valid = bcrypt.compareSync(String(current), req.user.passwordHash)
    if (!valid) return apiError(res, 400, 'Current password is incorrect')
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: bcrypt.hashSync(String(next), 10) },
    })
    res.json({ ok: true, message: 'Password updated' })
  }),
)

export default router
