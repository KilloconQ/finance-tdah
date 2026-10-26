import { inArray } from 'drizzle-orm'
import type { db as Db, schema as Schema } from '../db/client'

/**
 * Shared bits of the Postgres integration tests. The `vi.mock` calls (env, session) stay in each
 * test file because vitest hoists them; everything else lives here.
 */

/** Calls `app` as the test user `as` (the mocked session middleware reads `x-test-user`). */
export function createCaller(app: { request: (path: string, init?: RequestInit) => Response | Promise<Response> }) {
  return async function call(as: string, method: string, path: string, body?: unknown) {
    const res = await app.request(path, {
      method,
      headers: { 'x-test-user': as, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    return { status: res.status, body: (await res.json()) as Record<string, any> }
  }
}

/** Test user ids that are unique per run, so reruns and parallel files never collide. */
export const testUserIds = (prefix: string, names: string[]) => {
  const run = `${prefix}${Date.now()}`
  return names.map((n) => `${run}-${n}`)
}

export const testEmail = (id: string) => `${id}@test.local`

export async function seedUsers(
  db: typeof Db,
  schema: typeof Schema,
  ids: string[],
  name: (id: string) => string = (id) => id,
) {
  await db.insert(schema.user).values(ids.map((id) => ({ id, name: name(id), email: testEmail(id) })))
}

export async function dropUsers(db: typeof Db, schema: typeof Schema, ids: string[]) {
  await db.delete(schema.user).where(inArray(schema.user.id, ids))
}
