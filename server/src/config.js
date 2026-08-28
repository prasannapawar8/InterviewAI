import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SERVER_ROOT = path.resolve(__dirname, '..')

dotenv.config({ path: path.join(SERVER_ROOT, '.env'), override: true })
const isProd = process.env.NODE_ENV === 'production'

function requiredInProd(name, fallback) {
  const v = process.env[name] || fallback
  if (isProd && !process.env[name]) {
    throw new Error(`${name} must be set in production`)
  }
  return v
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd,
  port: Number(process.env.PORT) || 4000,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  jwtSecret: requiredInProd('JWT_SECRET', 'intervai-dev-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshCookieName: process.env.REFRESH_COOKIE_NAME || 'intervai_refresh',
  refreshExpiresDays: Number(process.env.REFRESH_EXPIRES_DAYS) || 7,
  databaseUrl: process.env.DATABASE_URL || '',
  redisUrl: process.env.REDIS_URL || '',
  dataDir: path.resolve(SERVER_ROOT, process.env.DATA_DIR || './data'),
  demoEmail: process.env.DEMO_EMAIL || 'aarav.mehta@example.com',
  demoPassword: process.env.DEMO_PASSWORD || 'password123',
  maxUploadBytes: 500 * 1024 * 1024,
  aiProvider: process.env.AI_PROVIDER || 'mock',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.7-flash',
  deepgramApiKey: process.env.DEEPGRAM_API_KEY || '',
  s3: {
    bucket: process.env.S3_BUCKET || '',
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || '',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  },
  retentionDays: Number(process.env.MEDIA_RETENTION_DAYS) || 30,
  defaultMinutesQuota: Number(process.env.DEFAULT_MINUTES_QUOTA) || 120,
  defaultMaxConcurrent: Number(process.env.DEFAULT_MAX_CONCURRENT) || 2,
  maxDurationSeconds: Number(process.env.MAX_DURATION_SECONDS) || 3600,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  stripePriceId: process.env.STRIPE_PRICE_ID || '',
  resendApiKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || 'IntervAI <noreply@intervai.local>',
  cookieSecure: process.env.COOKIE_SECURE === 'true' || isProd,
}
