import path from 'node:path'
import { prisma } from '../prisma.js'
import { config } from '../config.js'
import { logger } from '../logger.js'
import { generateAnalysis } from './ai/engine.js'
import { analyzeLive } from './ai/live.js'
import { getObjectBuffer, putJson } from './storage.js'
import { recordUsage } from './usage.service.js'
import { PIPELINE_STAGES } from './pipeline.stages.js'
import { matchQuestionPack } from './ai/features/questionPack.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const STEP_MS = config.aiProvider === 'live' ? 400 : 1500

async function setProgress(id, patch) {
  await prisma.analysis.update({ where: { id }, data: patch })
}

export async function processAnalysisJob({ analysisId }) {
  const row = await prisma.analysis.findUnique({ where: { id: analysisId } })
  if (!row) {
    logger.warn('job missing analysis', { analysisId })
    return
  }

  try {
    await setProgress(analysisId, { stage: 'upload', progress: 8, status: 'Processing', errorCode: null })

    const date = row.interviewDate.toISOString().slice(0, 10)
    let full
    let tokens = 0

    if (config.aiProvider === 'live' && row.fileKey && (config.openaiApiKey || config.deepgramApiKey || config.geminiApiKey)) {
      const buffer = await getObjectBuffer(row.fileKey)
      const ext = path.extname(row.fileName || '') || '.bin'
      const mime = ext.match(/mp4|mov|webm/i) ? 'video/mp4' : 'audio/mpeg'
      full = await analyzeLive({
        id: row.id,
        candidate: row.candidate,
        role: row.role,
        date,
        durationSeconds: row.durationSeconds,
        buffer,
        mime,
        fileName: row.fileName,
        rubricInstructions: row.rubricInstructions || null,
        onStage: async (stage, progress) => {
          await setProgress(analysisId, { stage, progress })
        },
      })
      tokens = Math.ceil((full.rawStt?.text || '').length / 4)
      if (full.rawStt) {
        await putJson(`transcripts/${row.orgId}/${row.id}.json`, full.rawStt)
      }
    } else {
      const total = PIPELINE_STAGES.length
      for (let i = 0; i < total; i++) {
        await setProgress(analysisId, { stage: PIPELINE_STAGES[i].key })
        await sleep(STEP_MS)
        await setProgress(analysisId, { progress: Math.round(((i + 1) / total) * 100) })
      }
      full = generateAnalysis({
        id: row.id,
        candidate: row.candidate,
        role: row.role,
        date,
        durationSeconds: row.durationSeconds,
      })
    }

    const { durationSeconds: measured, rawStt, ...doc } = full
    if (row.questionPack && Array.isArray(doc.transcript)) {
      doc.packCoverage = matchQuestionPack(doc.transcript, row.questionPack)
    }
    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: 'Completed',
        progress: 100,
        stage: 'report',
        errorCode: null,
        score: doc.score,
        sentiment: doc.sentiment,
        result: doc,
        durationSeconds: measured || row.durationSeconds,
        rawTranscriptKey: rawStt ? `transcripts/${row.orgId}/${row.id}.json` : undefined,
      },
    })
    await recordUsage({
      orgId: row.orgId,
      analysisId,
      minutes: (measured || row.durationSeconds) / 60,
      tokens,
    })
    logger.info('pipeline completed', { analysisId, provider: config.aiProvider })
  } catch (err) {
    logger.error('pipeline failed', { analysisId, error: err.message })
    const quota = /429|quota/i.test(err.message)
    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: 'Failed',
        errorCode: quota ? 'openai_quota' : 'pipeline_error',
      },
    })
    throw err
  }
}
