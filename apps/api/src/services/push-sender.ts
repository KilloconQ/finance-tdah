import webpush, { WebPushError } from 'web-push'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/client'
import { env } from '../env'
import { logger } from '../lib/logger'

webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY)

export type PushPayload = {
  title: string
  body: string
  url?: string
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const subscriptions = await db.query.pushSubscription.findMany({
    where: (s, { eq }) => eq(s.userId, userId),
  })

  await Promise.allSettled(
    subscriptions.map((subscription) => sendToSubscription(userId, subscription, payload)),
  )
}

async function sendToSubscription(
  userId: string,
  subscription: { id: string; endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
): Promise<void> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
    )
  } catch (err) {
    if (err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)) {
      await db.delete(schema.pushSubscription).where(eq(schema.pushSubscription.id, subscription.id))
      return
    }

    logger.error('push_send_failed', {
      userId,
      message: err instanceof Error ? err.message : String(err),
    })
  }
}
