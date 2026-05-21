import { eq } from 'drizzle-orm'
import { auth } from '../auth'
import { db, schema } from './client'

const DEMO_EMAIL = 'ana@finance-tdah.local'
const DEMO_PASSWORD = 'finance-tdah-demo!'

async function main() {
  console.log('🌱 Seeding database...')

  let userId: string

  try {
    const signup = await auth.api.signUpEmail({
      body: {
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        name: 'Ana',
      },
    })
    userId = signup.user.id
    console.log(`  ✓ Created demo user: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`)
  } catch (err) {
    const existing = await db.query.user.findFirst({
      where: (u, { eq }) => eq(u.email, DEMO_EMAIL),
    })
    if (!existing) throw err
    userId = existing.id
    console.log(`  ✓ Demo user already exists: ${DEMO_EMAIL}`)
  }

  await db
    .insert(schema.userProfile)
    .values({
      userId,
      displayName: 'Ana',
      pain: ['impulso', 'olvido', 'saldo'],
      inputPreference: 'voice',
      onboardingCompleted: true,
    })
    .onConflictDoNothing()

  await db.delete(schema.financialAccount).where(eq(schema.financialAccount.userId, userId))
  await db.insert(schema.financialAccount).values([
    { userId, name: 'BBVA Débito', type: 'debito', institution: 'BBVA', last4: '4521', balanceCents: 842000 },
    { userId, name: 'Mercado Pago', type: 'wallet', institution: 'MP', balanceCents: 124000 },
    { userId, name: 'Efectivo', type: 'efectivo', balanceCents: 35000 },
    { userId, name: 'Nu Tarjeta', type: 'credito', institution: 'Nu', last4: '8810', balanceCents: -289000 },
    { userId, name: 'Ahorro vacaciones', type: 'ahorro', institution: 'BBVA', balanceCents: 310000 },
  ])

  await db.insert(schema.goal).values([
    { userId, name: 'Vacaciones', emoji: '🏖️', targetCents: 500000, currentCents: 310000, deadline: '2026-08-15' },
    { userId, name: 'Nueva lap', emoji: '💻', targetCents: 1800000, currentCents: 420000 },
    { userId, name: 'Curso Figma', emoji: '🎨', targetCents: 250000, currentCents: 80000 },
    { userId, name: 'Fondo zen', emoji: '🌿', targetCents: 1000000, currentCents: 150000 },
  ])

  await db.insert(schema.expense).values([
    { userId, amountCents: 8900, category: 'café', description: 'Café Cielito', occurredAt: new Date() },
    { userId, amountCents: 24000, category: 'comida', description: 'Súper', occurredAt: daysAgo(1) },
    { userId, amountCents: 6500, category: 'transporte', description: 'Uber', occurredAt: daysAgo(1) },
    { userId, amountCents: 32000, category: 'comida', description: 'Cena con Lu', occurredAt: daysAgo(2) },
    { userId, amountCents: 12900, category: 'subs', description: 'Apple TV+', occurredAt: daysAgo(2) },
    { userId, amountCents: 4500, category: 'café', description: 'Latte', occurredAt: daysAgo(3) },
  ])

  await db.insert(schema.subscription).values([
    { userId, name: 'Apple TV+', category: 'streaming', amountCents: 12900, cadence: 'monthly', nextChargeAt: dateOffset(15), lastOpenedAt: dateOffset(-48), unused: true },
    { userId, name: 'Spotify', category: 'música', amountCents: 11900, cadence: 'monthly', nextChargeAt: dateOffset(22), lastOpenedAt: dateOffset(-1) },
    { userId, name: 'Notion', category: 'productividad', amountCents: 22000, cadence: 'monthly', nextChargeAt: dateOffset(18), lastOpenedAt: dateOffset(-1) },
    { userId, name: 'Audible', category: 'audiolibros', amountCents: 16900, cadence: 'monthly', nextChargeAt: dateOffset(32), lastOpenedAt: dateOffset(-96), unused: true },
    { userId, name: 'iCloud 200GB', category: 'almacenamiento', amountCents: 4900, cadence: 'monthly', nextChargeAt: dateOffset(13) },
    { userId, name: 'Netflix', category: 'streaming', amountCents: 26900, cadence: 'monthly', nextChargeAt: dateOffset(29), lastOpenedAt: dateOffset(-2) },
  ])

  await db.insert(schema.challenge).values({
    userId,
    name: 'Café en casa',
    description: 'Toma tu café de la mañana en casa esta semana. Ahorras ~$420.',
    days: 7,
    doneDays: 3,
    expectedSavingsCents: 42000,
  })

  console.log('✅ Seed completed.')
  process.exit(0)
}

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function dateOffset(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

main().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
