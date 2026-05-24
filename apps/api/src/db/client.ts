import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { schema } from '@finance-tdah/shared/db'
import { env } from '../env'

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
})

export const db = drizzle(pool, { schema })
export { schema }
export type Db = typeof db
// Tx is the transaction handle passed to db.transaction callbacks.
// Extracted via the Parameters utility to stay in sync with Drizzle's types.
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]
