import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { config } from './config.js'
import { prisma } from './prisma.js'
import { seedIfNeeded } from './db.js'
import { errorHandler, notFound } from './middleware/errors.js'
import { logger } from './logger.js'
import { initQueue, startWorker } from './services/queue.js'
import { purgeExpiredMedia } from './services/retention.service.js'
import authRoutes from './routes/auth.routes.js'
import usersRoutes from './routes/users.routes.js'
import dashboardRoutes from './routes/dashboard.routes.js'
import analysesRoutes from './routes/analyses.routes.js'
import orgsRoutes from './routes/orgs.routes.js'
import billingRoutes, { handleStripeWebhook } from './routes/billing.routes.js'
import shareRoutes from './routes/share.routes.js'

const app = express()

app.disable('x-powered-by')
app.set('trust proxy', 1)

app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || crypto.randomUUID()
  res.setHeader('X-Request-Id', req.requestId)
  next()
})

app.use(
  cors({
    origin: config.clientOrigin,
    credentials: true,
  }),
)
app.use(cookieParser())

app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
  handleStripeWebhook(req, res).catch(next)
})

app.use(express.json({ limit: '1mb' }))

app.get('/api/health', async (req, res) => {
  let db = 'ok'
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch {
    db = 'error'
  }
  res.json({
    ok: db === 'ok',
    service: 'intervai-api',
    time: new Date().toISOString(),
    db,
    aiProvider: config.aiProvider,
    llm: config.geminiApiKey ? 'gemini' : config.openaiApiKey ? 'openai' : 'none',
    stt: config.deepgramApiKey ? 'deepgram' : config.openaiApiKey ? 'whisper' : 'none',
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/analyses', analysesRoutes)
app.use('/api/share', shareRoutes)
app.use('/api/orgs', orgsRoutes)
app.use('/api/billing', billingRoutes)

app.use(notFound)
app.use(errorHandler)

export async function boot() {
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is required. Start Postgres (see docker-compose.yml) and copy server/.env.example.')
  }
  fs.mkdirSync(path.join(config.dataDir, 'uploads'), { recursive: true })
  fs.mkdirSync(path.join(os.tmpdir(), 'intervai-uploads'), { recursive: true })

  await prisma.$connect()
  await seedIfNeeded()
  await initQueue()

  if (process.env.RUN_WORKER === 'true' || !config.redisUrl) {
    await startWorker()
  }

  setInterval(() => {
    purgeExpiredMedia().catch((err) => logger.warn('retention sweep failed', { error: err.message }))
  }, 6 * 60 * 60 * 1000)
  purgeExpiredMedia().catch(() => {})

  const server = app.listen(config.port, () => {
    logger.info('api listening', { port: config.port, origin: config.clientOrigin })
    console.log('')
    console.log('  IntervAI API running')
    console.log(`  -> http://localhost:${config.port}/api/health`)
    console.log(`  -> Demo login:  ${config.demoEmail}  /  ${config.demoPassword}`)
    console.log('')
  })
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`port ${config.port} is already in use — stop the other Node process or change PORT`)
      process.exit(1)
    }
    throw err
  })
}

if (process.env.NODE_ENV !== 'test') {
  boot().catch((err) => {
    logger.error('boot failed', { error: err.message })
    process.exit(1)
  })
}

export default app
