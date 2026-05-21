import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('❌ DATABASE_URL is required to run migrations')
  process.exit(1)
}

async function main() {
  const pool = new Pool({ connectionString: databaseUrl, max: 1 })
  const db = drizzle(pool)

  console.log('⏳ Running migrations...')
  const start = Date.now()
  await migrate(db, { migrationsFolder: './drizzle' })
  console.log(`✅ Migrations completed in ${Date.now() - start}ms`)

  await pool.end()
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
