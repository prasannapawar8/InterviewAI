import { prisma } from '../prisma.js'
import { config } from '../config.js'
import { newId } from '../utils/ids.js'
import { logger } from '../logger.js'

export async function minutesUsedThisPeriod(orgId) {
  const start = new Date()
  start.setUTCDate(1)
  start.setUTCHours(0, 0, 0, 0)
  const agg = await prisma.usageEvent.aggregate({
    where: { orgId, createdAt: { gte: start } },
    _sum: { minutes: true, tokens: true },
  })
  return { minutes: agg._sum.minutes || 0, tokens: agg._sum.tokens || 0 }
}

export async function recordUsage({ orgId, analysisId, minutes, tokens = 0 }) {
  await prisma.usageEvent.create({
    data: {
      id: newId('usg'),
      orgId,
      analysisId,
      minutes: Math.max(1, Math.ceil(minutes)),
      tokens,
    },
  })
}

export async function assertCanStartJob(org) {
  const { minutes } = await minutesUsedThisPeriod(org.id)
  if (minutes >= org.minutesQuota) {
    const err = new Error(`Monthly transcription quota exceeded (${org.minutesQuota} minutes)`)
    err.status = 402
    err.code = 'quota_exceeded'
    throw err
  }
  const running = await prisma.analysis.count({
    where: { orgId: org.id, status: 'Processing' },
  })
  if (running >= org.maxConcurrentJobs) {
    const err = new Error(`Too many analyses in progress (max ${org.maxConcurrentJobs})`)
    err.status = 429
    err.code = 'concurrency_limit'
    throw err
  }
}

export async function getBillingSnapshot(org) {
  const used = await minutesUsedThisPeriod(org.id)
  return {
    plan: org.plan,
    minutesQuota: org.minutesQuota,
    minutesUsed: used.minutes,
    minutesRemaining: Math.max(0, org.minutesQuota - used.minutes),
    tokensUsed: used.tokens,
    stripeConfigured: Boolean(config.stripeSecretKey),
  }
}

export async function applyStripeSubscription(orgId, { customerId, subscriptionId, plan, minutesQuota }) {
  await prisma.organization.update({
    where: { id: orgId },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      ...(plan ? { plan } : {}),
      ...(minutesQuota ? { minutesQuota } : {}),
    },
  })
  logger.info('stripe subscription applied', { orgId, plan })
}
