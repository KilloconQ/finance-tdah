import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq, inArray } from 'drizzle-orm'
import { completeOnboardingSchema, updateProfileSchema } from '@finance-tdah/shared/schemas'
import { db, schema } from '../db/client'
import { sessionMiddleware, type SessionVariables } from '../middleware/session'

export const profileRoute = new Hono<{ Variables: SessionVariables }>()
  .use('*', sessionMiddleware)

  .get('/', async (c) => {
    const user = c.get('user')
    const profile = await db.query.userProfile.findFirst({
      where: (p, { eq }) => eq(p.userId, user.id),
    })

    if (!profile) {
      return c.json({ profile: null }, 200)
    }

    return c.json({ profile }, 200)
  })

  .post('/onboarding', zValidator('json', completeOnboardingSchema), async (c) => {
    const user = c.get('user')
    const input = c.req.valid('json')

    const result = await db.transaction(async (tx) => {
      const [profile] = await tx
        .insert(schema.userProfile)
        .values({
          userId: user.id,
          displayName: input.displayName,
          pain: input.pain,
          inputPreference: input.inputPreference,
          onboardingCompleted: true,
        })
        .onConflictDoUpdate({
          target: schema.userProfile.userId,
          set: {
            displayName: input.displayName,
            pain: input.pain,
            inputPreference: input.inputPreference,
            onboardingCompleted: true,
            updatedAt: new Date(),
          },
        })
        .returning()

      if (input.firstGoal) {
        await tx.insert(schema.goal).values({
          userId: user.id,
          name: input.firstGoal.name,
          emoji: input.firstGoal.emoji,
          targetCents: input.firstGoal.targetCents,
        })
      }

      return profile
    })

    return c.json({ profile: result }, 201)
  })

  .patch('/', zValidator('json', updateProfileSchema), async (c) => {
    const user = c.get('user')
    const patch = c.req.valid('json')

    const [profile] = await db
      .update(schema.userProfile)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(schema.userProfile.userId, user.id))
      .returning()

    return c.json({ profile })
  })

  .post('/delete', async (c) => {
    const user = c.get('user')

    // Every table that references user.id (session, account, verification, push
    // subscriptions and all finance data) is ON DELETE CASCADE, so removing the
    // user row removes the credentials, sessions and data in one atomic statement.
    // `verification` has no FK (it is keyed by identifier, usually the email), so it
    // is removed explicitly in the same transaction.
    await db.transaction(async (tx) => {
      await tx.delete(schema.verification).where(inArray(schema.verification.identifier, [user.email, user.id]))
      await tx.delete(schema.user).where(eq(schema.user.id, user.id))
    })

    return c.json({ success: true })
  })
