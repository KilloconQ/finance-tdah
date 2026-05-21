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
