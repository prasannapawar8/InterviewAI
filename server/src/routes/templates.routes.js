import { Router } from 'express'
import { prisma } from '../prisma.js'
import { requireAuth, requireRecruiter } from '../middleware/auth.js'
import { apiError, asyncHandler } from '../middleware/errors.js'
import { newId } from '../utils/ids.js'
import {
  BUILTIN_TEMPLATES,
  normalizeCompetencies,
  toTemplateDto,
} from '../services/templates.js'

const router = Router()
router.use(requireAuth)

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = await prisma.roleTemplate.findMany({
      where: { orgId: req.orgId },
      orderBy: { name: 'asc' },
    })
    res.json({ items: rows.map(toTemplateDto) })
  }),
)

router.post(
  '/',
  requireRecruiter,
  asyncHandler(async (req, res) => {
    const name = String(req.body?.name || '').trim().slice(0, 80)
    if (name.length < 2) return apiError(res, 400, 'Template name is required')
    const row = await prisma.roleTemplate.create({
      data: {
        id: newId('tpl'),
        orgId: req.orgId,
        name,
        roleTitle: String(req.body?.roleTitle || '').trim().slice(0, 80),
        questionPack: String(req.body?.questionPack || '').slice(0, 8000),
        competencies: normalizeCompetencies(req.body?.competencies),
      },
    })
    res.status(201).json(toTemplateDto(row))
  }),
)

router.patch(
  '/:id',
  requireRecruiter,
  asyncHandler(async (req, res) => {
    const existing = await prisma.roleTemplate.findFirst({
      where: { id: req.params.id, orgId: req.orgId },
    })
    if (!existing) return apiError(res, 404, 'Template not found')
    const data = {}
    if (req.body?.name !== undefined) {
      const name = String(req.body.name).trim().slice(0, 80)
      if (name.length < 2) return apiError(res, 400, 'Template name is required')
      data.name = name
    }
    if (req.body?.roleTitle !== undefined) data.roleTitle = String(req.body.roleTitle).trim().slice(0, 80)
    if (req.body?.questionPack !== undefined) data.questionPack = String(req.body.questionPack).slice(0, 8000)
    if (req.body?.competencies !== undefined) data.competencies = normalizeCompetencies(req.body.competencies)
    const row = await prisma.roleTemplate.update({ where: { id: existing.id }, data })
    res.json(toTemplateDto(row))
  }),
)

router.delete(
  '/:id',
  requireRecruiter,
  asyncHandler(async (req, res) => {
    const existing = await prisma.roleTemplate.findFirst({
      where: { id: req.params.id, orgId: req.orgId },
    })
    if (!existing) return apiError(res, 404, 'Template not found')
    await prisma.roleTemplate.delete({ where: { id: existing.id } })
    res.json({ ok: true })
  }),
)

export async function seedBuiltinTemplates(orgId) {
  const count = await prisma.roleTemplate.count({ where: { orgId } })
  if (count) return
  for (const t of BUILTIN_TEMPLATES) {
    await prisma.roleTemplate.create({
      data: {
        id: newId('tpl'),
        orgId,
        name: t.name,
        roleTitle: t.roleTitle,
        questionPack: t.questionPack,
        competencies: t.competencies,
      },
    })
  }
}

export default router
