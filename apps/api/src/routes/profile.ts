import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
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
