import path from 'node:path'
import { prisma } from '../prisma.js'
import { config } from '../config.js'
import { newId, formatDuration } from '../utils/ids.js'
import { enqueueAnalysis } from './queue.js'
import { PIPELINE_STAGES } from './pipeline.stages.js'
import { prepareTranscript } from './ai/live.js'

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
}) {
  const now = new Date()
  const durationSeconds = Math.min(config.maxDurationSeconds, durationFromSize(size))
  const name = (candidate && candidate.trim()) || humanizeName(path.parse(originalName || '').name)
  const mediaExpiresAt = new Date(now.getTime() + config.retentionDays * 24 * 60 * 60 * 1000)

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
      role: role?.trim() || 'Interview Candidate',
      interviewDate: now,
      durationSeconds,
      mediaExpiresAt,
    },
  })

  await enqueueAnalysis({ analysisId: id })
  return toAnalysisDoc(row)
}

export function toAnalysisDoc(row) {
  const result = row.result || {}
  const date = row.interviewDate.toISOString().slice(0, 10)
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
    transcript: Array.isArray(result.transcript) ? prepareTranscript(result.transcript) : result.transcript || null,
    sentimentBreakdown: result.sentimentBreakdown || null,
    sentimentTimeline: result.sentimentTimeline || null,
    confidenceTrend: result.confidenceTrend || null,
    communicationMetrics: result.communicationMetrics || null,
    strengths: result.strengths || null,
    weaknesses: result.weaknesses || null,
    aiSummary: result.aiSummary || null,
    score: row.score,
    sentiment: row.sentiment,
  }
}

export async function retryAnalysis(id) {
  await prisma.analysis.update({
    where: { id },
    data: { status: 'Processing', progress: 0, stage: 'upload', errorCode: null },
  })
  await enqueueAnalysis({ analysisId: id })
}
