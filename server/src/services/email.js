import crypto from 'node:crypto'
import { config } from '../config.js'
import { logger } from '../logger.js'

export async function sendEmail({ to, subject, html, text }) {
  if (config.resendApiKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: config.emailFrom, to, subject, html, text }),
    })
    if (!res.ok) {
      const body = await res.text()
      logger.error('email send failed', { status: res.status, body })
      throw new Error('Failed to send email')
    }
    logger.info('email sent', { to, subject })
    return
  }
  logger.info('email (log only — set RESEND_API_KEY to send)', { to, subject, text })
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex')
}
