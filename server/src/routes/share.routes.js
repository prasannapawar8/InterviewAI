import { Router } from 'express'
import { findAnalysis } from '../db.js'
import { toAnalysisDoc } from '../services/analysis.service.js'
import { verifyShareToken } from '../services/share.js'
import { apiError, asyncHandler } from '../middleware/errors.js'

const router = Router()

router.get('/:token', asyncHandler(async (req, res) => {
  let analysisId
  try {
    ({ analysisId } = verifyShareToken(req.params.token))
  } catch {
    return apiError(res, 404, 'This share link is invalid or has expired')
  }
  const a = await findAnalysis(analysisId)
  if (!a || a.status !== 'Completed' || a.archivedAt) {
    return apiError(res, 404, 'This share link is invalid or has expired')
  }
  const doc = toAnalysisDoc(a)
  const {
    overview, transcript, sentimentBreakdown, sentimentTimeline, confidenceTrend,
    communicationMetrics, scoreBreakdown, talkTime, starCoverage, strengths, weaknesses, aiSummary,
  } = doc
  res.json({
    overview: { ...overview, id: a.id },
    transcript, sentimentBreakdown, sentimentTimeline, confidenceTrend,
    communicationMetrics, scoreBreakdown, talkTime, starCoverage, strengths, weaknesses, aiSummary,
    status: a.status,
    decision: doc.decision,
    sentiment: doc.sentiment,
    packCoverage: doc.packCoverage,
    readOnly: true,
  })
}))

export default router
