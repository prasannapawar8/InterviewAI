import path from 'node:path'
import { prisma } from '../prisma.js'
import { config } from '../config.js'
import { formatDuration } from '../utils/ids.js'
import { enqueueAnalysis } from './queue.js'
import { PIPELINE_STAGES } from './pipeline.stages.js'
import { prepareTranscript, summarizeInterview, isPlaceholderSummary } from './ai/live.js'
import { analyzeTurns } from './ai/features/turns.js'
import { detectStar } from './ai/features/star.js'
import { matchQuestionPack } from './ai/features/questionPack.js'
import { explainScore } from './ai/score.js'
import {
  mergeScorecard,
  normalizeScorecard,
  scorecardAverage,
  snapshotFromTemplate,
} from './templates.js'

export { PIPELINE_STAGES }

function durationFromSize(bytes) {
  const seconds = Math.round((bytes || 5_000_000) / 16_000)
  return Math.min(config.maxDurationSeconds, Math.max(180, seconds))
}

function humanizeName(stem) {
  return stem
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ') || 'Interview Candidate'
}

export async function createAnalysisJob({
  id,
  orgId,
  createdById,
  fileKey,
  originalName,
  size,
  candidate,
  role,
  candidateConsent,
  questionPack,
  templateId,
}) {
  const now = new Date()
  const durationSeconds = Math.min(config.maxDurationSeconds, durationFromSize(size))
  const name = (candidate && candidate.trim()) || humanizeName(path.parse(originalName || '').name)
  const mediaExpiresAt = new Date(now.getTime() + config.retentionDays * 24 * 60 * 60 * 1000)

  let pack = questionPack ? String(questionPack).slice(0, 8000) : null
  let roleName = role?.trim() || ''
  let scorecard = null
  let linkedTemplateId = null
  if (templateId) {
    const template = await prisma.roleTemplate.findFirst({ where: { id: String(templateId), orgId } })
    if (template) {
      linkedTemplateId = template.id
      if (!pack) pack = template.questionPack || null
      if (!roleName) roleName = template.roleTitle || ''
      scorecard = snapshotFromTemplate(template)
    }
  }

  const row = await prisma.analysis.create({
    data: {
      id,
      orgId,
      createdById,
      status: 'Processing',
      progress: 0,
      stage: 'upload',
      fileName: originalName || null,
      fileKey,
      candidateConsent: Boolean(candidateConsent),
      candidate: name,
      role: roleName || 'Interview Candidate',
      interviewDate: now,
      durationSeconds,
      mediaExpiresAt,
      questionPack: pack,
      templateId: linkedTemplateId,
      scorecard,
    },
  })

  await enqueueAnalysis({ analysisId: id })
  return toAnalysisDoc(row)
}

export function toAnalysisDoc(row) {
  const result = row.result || {}
  const date = row.interviewDate.toISOString().slice(0, 10)
  const transcript = Array.isArray(result.transcript) ? prepareTranscript(result.transcript) : result.transcript || null
  const talkTime = result.talkTime || (Array.isArray(transcript) ? analyzeTurns(transcript) : null)
  const starCoverage = result.starCoverage || (Array.isArray(transcript) ? detectStar(transcript) : null)
  let scoreBreakdown = result.scoreBreakdown || null
  if (!scoreBreakdown && result.confidenceTrend && result.sentimentBreakdown && result.communicationMetrics) {
    scoreBreakdown = explainScore({
      confidence: result.confidenceTrend,
      sentiment: { breakdown: result.sentimentBreakdown },
      metrics: result.communicationMetrics,
    }).breakdown
  }
  const packCoverage =
    row.questionPack && Array.isArray(transcript)
      ? matchQuestionPack(transcript, row.questionPack)
      : result.packCoverage || null
  return {
    id: row.id,
    orgId: row.orgId,
    ownerId: row.createdById,
    status: row.status,
    progress: row.progress,
    stage: row.stage,
    errorCode: row.errorCode,
    fileName: row.fileName,
    filePath: row.fileKey,
    createdAt: row.createdAt.toISOString(),
    overview: result.overview || {
      id: row.id,
      candidate: row.candidate,
      role: row.role,
      date,
      duration: formatDuration(row.durationSeconds),
      overallScore: row.score,
      recommendation: null,
    },
    transcript,
    sentimentBreakdown: result.sentimentBreakdown || null,
    sentimentTimeline: result.sentimentTimeline || null,
    confidenceTrend: result.confidenceTrend || null,
    communicationMetrics: result.communicationMetrics || null,
    scoreBreakdown,
    talkTime,
    starCoverage,
    strengths: result.strengths || null,
    weaknesses: result.weaknesses || null,
    aiSummary: result.aiSummary || null,
    score: row.score,
    sentiment: row.sentiment,
    decision: row.decision || null,
    notes: row.notes || '',
    questionPack: row.questionPack || '',
    packCoverage,
    templateId: row.templateId || null,
    scorecard: row.scorecard || null,
    scorecardAverage: scorecardAverage(row.scorecard),
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
  }
}

export async function updateAnalysisReview(id, { decision, notes, questionPack, scorecard, applyTemplateId }) {
  const data = {}
  if (decision !== undefined) {
    const allowed = ['Advance', 'Consider', 'Reject', '']
    if (!allowed.includes(decision) && decision !== null) {
      const err = new Error('Decision must be Advance, Consider, or Reject')
      err.status = 400
      throw err
    }
    data.decision = decision || null
  }
  if (notes !== undefined) data.notes = String(notes).slice(0, 4000)
  if (questionPack !== undefined) data.questionPack = String(questionPack).slice(0, 8000) || null
  if (scorecard !== undefined) data.scorecard = normalizeScorecard(scorecard)
  if (applyTemplateId) {
    const current = await prisma.analysis.findUnique({ where: { id } })
    if (!current) return null
    const template = await prisma.roleTemplate.findFirst({
      where: { id: String(applyTemplateId), orgId: current.orgId },
    })
    if (!template) {
      const err = new Error('Template not found')
      err.status = 400
      throw err
    }
    data.templateId = template.id
    data.questionPack = template.questionPack || null
    data.scorecard = mergeScorecard(current.scorecard, template)
    if (!current.role || current.role === 'Interview Candidate') {
      if (template.roleTitle) data.role = template.roleTitle
    }
  }
  if (!Object.keys(data).length) return prisma.analysis.findUnique({ where: { id } })
  return prisma.analysis.update({ where: { id }, data })
}

export async function retryAnalysis(id) {
  await prisma.analysis.update({
    where: { id },
    data: { status: 'Processing', progress: 0, stage: 'upload', errorCode: null },
  })
  await enqueueAnalysis({ analysisId: id })
}

/** If the stored PDF summary is the Gemini-unavailable placeholder, try Gemini again and persist. */
export async function ensureLiveSummary(row) {
  const doc = toAnalysisDoc(row)
  if (!doc.aiSummary || !isPlaceholderSummary(doc.aiSummary.executive)) return row
  const aiSummary = await summarizeInterview({
    candidate: row.candidate,
    role: row.role,
    overallScore: row.score ?? doc.overview?.overallScore,
    sentiment: row.sentiment || 'Neutral',
    strengths: doc.strengths || [],
    weaknesses: doc.weaknesses || [],
    metrics: doc.communicationMetrics || [],
    transcript: doc.transcript || [],
  })
  const result = {
    ...(row.result && typeof row.result === 'object' ? row.result : {}),
    aiSummary,
    overview: { ...(doc.overview || {}), recommendation: aiSummary.recommendation },
  }
  return prisma.analysis.update({
    where: { id: row.id },
    data: { result },
  })
}
