import { Router } from 'express'
import { prisma } from '../prisma.js'
import { requireAuth, requireRecruiter } from '../middleware/auth.js'
import { apiError, asyncHandler } from '../middleware/errors.js'
import { newId } from '../utils/ids.js'
import {
  BUILTIN_TEMPLATES,
  normalizeCompetencies,
  normalizeCompetencyWeights,
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
    const competencies = normalizeCompetencies(req.body?.competencies)
    const row = await prisma.roleTemplate.create({
      data: {
        id: newId('tpl'),
        orgId: req.orgId,
        name,
        roleTitle: String(req.body?.roleTitle || '').trim().slice(0, 80),
        description: String(req.body?.description || '').trim().slice(0, 300),
        questionPack: String(req.body?.questionPack || '').slice(0, 8000),
        rubricInstructions: String(req.body?.rubricInstructions || '').slice(0, 4000),
        competencies,
        competencyWeights: normalizeCompetencyWeights(req.body?.competencyWeights, competencies),
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
    if (req.body?.description !== undefined) data.description = String(req.body.description).trim().slice(0, 300)
    if (req.body?.questionPack !== undefined) data.questionPack = String(req.body.questionPack).slice(0, 8000)
    if (req.body?.rubricInstructions !== undefined) data.rubricInstructions = String(req.body.rubricInstructions).slice(0, 4000)
    if (req.body?.competencies !== undefined) {
      data.competencies = normalizeCompetencies(req.body.competencies)
      // Re-normalize weights against updated competencies
      if (req.body?.competencyWeights !== undefined) {
        data.competencyWeights = normalizeCompetencyWeights(req.body.competencyWeights, data.competencies)
      }
    } else if (req.body?.competencyWeights !== undefined) {
      // Weights update without competency change — use existing competencies
      const currentCompetencies = normalizeCompetencies(existing.competencies)
      data.competencyWeights = normalizeCompetencyWeights(req.body.competencyWeights, currentCompetencies)
    }
    const row = await prisma.roleTemplate.update({ where: { id: existing.id }, data })
    res.json(toTemplateDto(row))
  }),
)

router.post(
  '/:id/clone',
  requireRecruiter,
  asyncHandler(async (req, res) => {
    const existing = await prisma.roleTemplate.findFirst({
      where: { id: req.params.id, orgId: req.orgId },
    })
    if (!existing) return apiError(res, 404, 'Template not found')
    const row = await prisma.roleTemplate.create({
      data: {
        id: newId('tpl'),
        orgId: req.orgId,
        name: `${existing.name} (copy)`.slice(0, 80),
        roleTitle: existing.roleTitle,
        description: existing.description,
        questionPack: existing.questionPack,
        rubricInstructions: existing.rubricInstructions,
        competencies: existing.competencies,
        competencyWeights: existing.competencyWeights,
      },
    })
    res.status(201).json(toTemplateDto(row))
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
        description: t.description || '',
        questionPack: t.questionPack,
        rubricInstructions: t.rubricInstructions || '',
        competencies: t.competencies,
        competencyWeights: t.competencyWeights || null,
      },
    })
  }
}

export default router
