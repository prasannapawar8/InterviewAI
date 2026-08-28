import { config } from './config.js'
import { prisma } from './prisma.js'
import { logger } from './logger.js'
import { initQueue, startWorker } from './services/queue.js'
import { purgeExpiredMedia } from './services/retention.service.js'

async function main() {
  if (!config.databaseUrl) throw new Error('DATABASE_URL is required')
  let lastErr
  for (let i = 1; i <= 8; i++) {
    try {
      await prisma.$connect()
      lastErr = null
      break
    } catch (err) {
      lastErr = err
      logger.warn('database not ready, retrying', { attempt: i, error: err.message })
      await new Promise((r) => setTimeout(r, 1500))
    }
  }
  if (lastErr) throw lastErr
  await initQueue()
  if (!config.redisUrl) {
    logger.warn('worker started without REDIS_URL — jobs will not be pulled from BullMQ')
  }
  await startWorker()
  setInterval(() => {
    purgeExpiredMedia().catch((err) => logger.warn('retention sweep failed', { error: err.message }))
  }, 60 * 60 * 1000)
  await purgeExpiredMedia()
  logger.info('worker ready')
}

main().catch((err) => {
  logger.error('worker boot failed', { error: err.message })
  process.exit(1)
})
