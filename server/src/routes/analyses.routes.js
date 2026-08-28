import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs/promises'
import { Router } from 'express'
import multer from 'multer'
import { config } from '../config.js'
import { findAnalysis, listAnalyses, toListRow } from '../db.js'
import { requireAuth, requireRecruiter } from '../middleware/auth.js'
import { apiError, asyncHandler } from '../middleware/errors.js'
import { createAnalysisJob, retryAnalysis, toAnalysisDoc } from '../services/analysis.service.js'
import { renderReportPdf } from '../utils/pdf.js'
import { newId } from '../utils/ids.js'
import { putObject } from '../services/storage.js'
import { assertCanStartJob } from '../services/usage.service.js'
import { rateLimit } from '../middleware/rateLimit.js'

const router = Router()
router.use(requireAuth)

const tmpDir = path.join(os.tmpdir(), 'intervai-uploads')
const upload = multer({
  dest: tmpDir,
  limits: { fileSize: config.maxUploadBytes },
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')
    cb(ok ? null : new Error('Only audio or video files are supported'), ok)
  },
})

router.get('/', asyncHandler(async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
  const items = (await listAnalyses(req.orgId, { limit })).map(toListRow)
  res.json({ items, total: items.length })
}))

router.post(
  '/',
  requireRecruiter,
  rateLimit({ windowMs: 60_000, max: 8, key: (req) => req.orgId || req.ip }),
  (req, res, next) => {
    req.analysisId = newId('int')
    next()
  },
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) return apiError(res, 400, 'No file uploaded — expected multipart field "file"')
    const consent = req.body?.candidateConsent === 'true' || req.body?.candidateConsent === true
    if (!consent) {
      await fs.unlink(req.file.path).catch(() => {})
      return apiError(res, 400, 'Candidate recording consent is required')
    }

    try {
      await assertCanStartJob(req.org)
      const estimated = Math.round((req.file.size || 5_000_000) / 16_000)
      if (estimated > req.org.maxDurationSeconds) {
        const err = new Error(`Recording exceeds the ${Math.round(req.org.maxDurationSeconds / 60)} minute limit`)
        err.status = 400
        err.code = 'duration_limit'
        throw err
      }

      const ext = path.extname(req.file.originalname || '').toLowerCase() || '.bin'
      const key = `recordings/${req.orgId}/${req.analysisId}${ext}`
      await putObject(key, req.file.path, req.file.mimetype)
      await fs.unlink(req.file.path).catch(() => {})

      const doc = await createAnalysisJob({
        id: req.analysisId,
        orgId: req.orgId,
        createdById: req.user.id,
        fileKey: key,
        originalName: req.file.originalname,
        size: req.file.size,
        candidate: req.body?.candidate,
        role: req.body?.role,
        candidateConsent: true,
      })
      res.status(201).json({ id: doc.id, status: doc.status })
    } catch (err) {
      await fs.unlink(req.file.path).catch(() => {})
      throw err
    }
  }),
)

function scoped(req, a) {
  return a && a.orgId === req.orgId
}

router.get('/:id', asyncHandler(async (req, res) => {
  const a = await findAnalysis(req.params.id)
  if (!scoped(req, a)) return apiError(res, 404, 'Analysis not found')
  const doc = toAnalysisDoc(a)
  const {
    overview, transcript, sentimentBreakdown, sentimentTimeline, confidenceTrend,
    communicationMetrics, strengths, weaknesses, aiSummary,
  } = doc
  res.json({
    overview, transcript, sentimentBreakdown, sentimentTimeline, confidenceTrend,
    communicationMetrics, strengths, weaknesses, aiSummary, status: a.status,
  })
}))

function statusError(code) {
  if (code === 'openai_quota') {
    return 'OpenAI quota exceeded. Set GEMINI_API_KEY for reports, or add OpenAI billing.'
  }
  if (code === 'pipeline_error') return 'Processing failed. Check the worker log and try again.'
  return null
}

router.get('/:id/status', asyncHandler(async (req, res) => {
  const a = await findAnalysis(req.params.id)
  if (!scoped(req, a)) return apiError(res, 404, 'Analysis not found')
  res.json({
    id: a.id,
    status: a.status,
    progress: a.progress ?? 0,
    stage: a.stage ?? null,
    errorCode: a.errorCode,
    error: statusError(a.errorCode),
    resultId: a.status === 'Completed' ? a.id : null,
  })
}))

router.post(
  '/:id/retry',
  requireRecruiter,
  asyncHandler(async (req, res) => {
    const a = await findAnalysis(req.params.id)
    if (!scoped(req, a)) return apiError(res, 404, 'Analysis not found')
    if (a.status !== 'Failed') return apiError(res, 409, 'Only failed analyses can be retried')
    await assertCanStartJob(req.org)
    await retryAnalysis(a.id)
    res.json({ id: a.id, status: 'Processing' })
  }),
)

router.get('/:id/report.pdf', asyncHandler(async (req, res) => {
  const a = await findAnalysis(req.params.id)
  if (!scoped(req, a)) return apiError(res, 404, 'Analysis not found')
  if (a.status !== 'Completed') return apiError(res, 409, 'Report not ready yet')
  const pdf = renderReportPdf(toAnalysisDoc(a))
  const safe = (a.candidate || 'candidate').replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="intervai-report-${safe}.pdf"`)
  res.setHeader('Content-Length', pdf.length)
  res.send(pdf)
}))

export default router
