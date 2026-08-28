import bcrypt from 'bcryptjs'
import { prisma } from './prisma.js'
import { config } from './config.js'
import { newId } from './utils/ids.js'
import { generateAnalysis } from './services/ai/engine.js'
import { logger } from './logger.js'

const DEFAULT_PREFS = {
  notifications: {
    analysisComplete: true,
    weeklyDigest: true,
    productUpdates: false,
    teamActivity: true,
    marketing: false,
  },
}

const SEED_ANALYSES = [
  { id: 'int_1042', candidate: 'Sofia Alvarez', role: 'Senior Product Designer', date: '2026-06-18', durationSeconds: 32 * 60 + 14 },
  { id: 'int_1041', candidate: 'Liam O’Connor', role: 'Backend Engineer', date: '2026-06-17', durationSeconds: 41 * 60 + 2 },
  { id: 'int_1040', candidate: 'Priya Nair', role: 'Data Scientist', date: '2026-06-17', durationSeconds: 28 * 60 + 47 },
  { id: 'int_1039', candidate: 'Marcus Chen', role: 'Engineering Manager', date: '2026-06-16', durationSeconds: 52 * 60 + 30 },
  { id: 'int_1038', candidate: 'Hannah Müller', role: 'UX Researcher', date: '2026-06-15', durationSeconds: 35 * 60 + 18 },
  { id: 'int_1037', candidate: 'Diego Santos', role: 'DevOps Engineer', date: '2026-06-14', durationSeconds: 39 * 60 + 55 },
]

export async function seedIfNeeded() {
  const existing = await prisma.user.findUnique({ where: { email: config.demoEmail } })
  if (existing) return

  const org = await prisma.organization.create({
    data: {
      id: 'org_northwind',
      name: 'Northwind Talent',
      slug: 'northwind-talent',
      plan: 'starter',
      minutesQuota: config.defaultMinutesQuota,
      maxConcurrentJobs: config.defaultMaxConcurrent,
      maxDurationSeconds: config.maxDurationSeconds,
    },
  })

  const user = await prisma.user.create({
    data: {
      id: 'usr_001',
      name: 'Aarav Mehta',
      email: config.demoEmail,
      jobTitle: 'Talent Lead',
      company: 'Northwind Talent',
      joinedAt: new Date('2025-11-02'),
      passwordHash: bcrypt.hashSync(config.demoPassword, 10),
      preferences: DEFAULT_PREFS,
    },
  })

  await prisma.membership.create({
    data: { id: 'mem_001', userId: user.id, orgId: org.id, role: 'owner' },
  })

  for (const row of SEED_ANALYSES) {
    const doc = generateAnalysis(row)
    await prisma.analysis.create({
      data: {
        id: row.id,
        orgId: org.id,
        createdById: user.id,
        status: 'Completed',
        progress: 100,
        stage: 'report',
        candidateConsent: true,
        candidate: row.candidate,
        role: row.role,
        interviewDate: new Date(`${row.date}T10:00:00Z`),
        durationSeconds: row.durationSeconds,
        score: doc.score,
        sentiment: doc.sentiment,
        result: doc,
      },
    })
  }
  logger.info('seeded demo org and analyses', { orgId: org.id, email: config.demoEmail })
}

export async function createUserWithOrg({ name, email, password, orgName }) {
  const user = await prisma.user.create({
    data: {
      id: newId('usr'),
      name,
      email: email.toLowerCase(),
      passwordHash: bcrypt.hashSync(password, 10),
      preferences: DEFAULT_PREFS,
      company: orgName || '',
    },
  })
  const slugBase = (orgName || `${name}-org`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'org'
  const slug = `${slugBase}-${newId('s').slice(-4)}`
  const org = await prisma.organization.create({
    data: {
      id: newId('org'),
      name: orgName || `${name}'s workspace`,
      slug,
      minutesQuota: config.defaultMinutesQuota,
      maxConcurrentJobs: config.defaultMaxConcurrent,
      maxDurationSeconds: config.maxDurationSeconds,
    },
  })
  await prisma.membership.create({
    data: { id: newId('mem'), userId: user.id, orgId: org.id, role: 'owner' },
  })
  return { user, org, role: 'owner' }
}

export async function findByEmail(email) {
  return prisma.user.findUnique({ where: { email: String(email).toLowerCase() } })
}

export async function findById(id) {
  return prisma.user.findUnique({ where: { id } })
}

export async function getMemberships(userId) {
  return prisma.membership.findMany({
    where: { userId },
    include: { org: true },
  })
}

export function toPublicUser(user, { org, membershipRole } = {}) {
  if (!user) return null
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.jobTitle,
    company: org?.name || user.company,
    avatar: user.avatar,
    joinedAt: user.joinedAt instanceof Date ? user.joinedAt.toISOString().slice(0, 10) : user.joinedAt,
    preferences: user.preferences,
    orgId: org?.id || null,
    orgName: org?.name || null,
    membershipRole: membershipRole || null,
    org: org
      ? {
          id: org.id,
          name: org.name,
          plan: org.plan,
          minutesQuota: org.minutesQuota,
        }
      : null,
  }
}

export function toListRow(a) {
  const overview = a.result?.overview || {}
  return {
    id: a.id,
    candidate: overview.candidate || a.candidate,
    role: overview.role || a.role,
    date: overview.date || a.interviewDate.toISOString().slice(0, 10),
    duration: overview.duration,
    score: a.score,
    sentiment: a.sentiment,
    status: a.status,
  }
}

export async function listAnalyses(orgId, { limit } = {}) {
  return prisma.analysis.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export async function findAnalysis(id) {
  return prisma.analysis.findUnique({ where: { id } })
}
