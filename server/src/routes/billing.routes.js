import { Router } from 'express'
import { config } from '../config.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { apiError, asyncHandler } from '../middleware/errors.js'
import { applyStripeSubscription, getBillingSnapshot } from '../services/usage.service.js'
import { logger } from '../logger.js'

const router = Router()

router.get('/usage', requireAuth, asyncHandler(async (req, res) => {
  res.json(await getBillingSnapshot(req.org))
}))

router.post(
  '/checkout',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    if (!config.stripeSecretKey || !config.stripePriceId) {
      return res.json({
        url: null,
        mock: true,
        message: 'Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID.',
      })
    }
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(config.stripeSecretKey)
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: config.stripePriceId, quantity: 1 }],
      success_url: `${config.clientOrigin}/settings?billing=success`,
      cancel_url: `${config.clientOrigin}/settings?billing=cancel`,
      customer_email: req.user.email,
      metadata: { orgId: req.orgId },
    })
    res.json({ url: session.url, mock: false })
  }),
)

export async function handleStripeWebhook(req, res) {
  if (!config.stripeSecretKey || !config.stripeWebhookSecret) {
    return apiError(res, 501, 'Stripe webhook is not configured')
  }
  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(config.stripeSecretKey)
  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], config.stripeWebhookSecret)
  } catch (err) {
    logger.warn('stripe signature failed', { error: err.message })
    return apiError(res, 400, 'Invalid Stripe signature')
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const orgId = session.metadata?.orgId
    if (orgId) {
      await applyStripeSubscription(orgId, {
        customerId: session.customer,
        subscriptionId: session.subscription,
        plan: 'pro',
        minutesQuota: 1000,
      })
    }
  }
  res.json({ received: true })
}

export default router
