import { prisma } from '../prisma.js'
import { deleteObject } from './storage.js'
import { logger } from '../logger.js'

export async function purgeExpiredMedia() {
  const due = await prisma.analysis.findMany({
    where: {
      mediaExpiresAt: { lte: new Date() },
      fileKey: { not: null },
    },
    select: { id: true, fileKey: true, rawTranscriptKey: true },
  })
  for (const row of due) {
    await deleteObject(row.fileKey)
    if (row.rawTranscriptKey) await deleteObject(row.rawTranscriptKey)
    await prisma.analysis.update({
      where: { id: row.id },
      data: { fileKey: null, rawTranscriptKey: null },
    })
    logger.info('purged expired media', { analysisId: row.id })
  }
  return due.length
}
