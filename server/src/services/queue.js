import { config } from '../config.js'
import { logger } from '../logger.js'
import { processAnalysisJob } from './pipeline.processor.js'

const QUEUE_NAME = 'analysis-pipeline'
let bullQueue = null
const localJobs = new Map()

export async function initQueue() {
  if (!config.redisUrl) {
    logger.warn('REDIS_URL not set — using in-process job queue')
    return
  }
  try {
    const Redis = (await import('ioredis')).default
    const ping = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true,
    })
    await ping.connect()
    await ping.ping()
    await ping.quit()
    const { Queue } = await import('bullmq')
    bullQueue = new Queue(QUEUE_NAME, { connection: { url: config.redisUrl } })
    logger.info('BullMQ queue ready', { queue: QUEUE_NAME })
  } catch (err) {
    logger.warn('Redis unavailable — falling back to in-process queue', { error: err.message })
    bullQueue = null
  }
}

/** Start a worker in this process (API can also run workers; dedicated worker.js preferred). */
export async function startWorker() {
  if (!config.redisUrl) return
  const { Worker } = await import('bullmq')
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      await processAnalysisJob(job.data)
    },
    { connection: { url: config.redisUrl }, concurrency: 2 },
  )
  worker.on('failed', (job, err) => {
    logger.error('pipeline job failed', { jobId: job?.id, error: err.message })
  })
  logger.info('BullMQ worker listening')
  return worker
}

export async function enqueueAnalysis(payload) {
  if (bullQueue) {
    await bullQueue.add('analyze', payload, {
      jobId: payload.analysisId,
      attempts: 2,
      backoff: { type: 'exponential', delay: 8000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    })
    logger.info('enqueued analysis', { analysisId: payload.analysisId, backend: 'bullmq' })
    return
  }
  if (localJobs.has(payload.analysisId)) return
  localJobs.set(payload.analysisId, true)
  setImmediate(() => {
    processAnalysisJob(payload)
      .catch((err) => logger.error('in-process job failed', { error: err.message }))
      .finally(() => localJobs.delete(payload.analysisId))
  })
  logger.info('enqueued analysis', { analysisId: payload.analysisId, backend: 'in-process' })
}
