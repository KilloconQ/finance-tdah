import { defineConfig } from 'drizzle-kit'

const url = process.env.DATABASE_URL
if (!url) {
  throw new Error('DATABASE_URL is required for drizzle-kit')
}

export default defineConfig({
  dialect: 'postgresql',
  schema: '../../packages/shared/src/db/schema/index.ts',
  out: './drizzle',
  dbCredentials: { url },
  strict: true,
  verbose: true,
})
