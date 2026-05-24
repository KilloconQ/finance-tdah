import { describe, it, expect, vi } from 'vitest'
import { findUserAccountById } from './account.repository'

// Mock the db/client module so no real Postgres connection is needed
vi.mock('../../../db/client', () => ({
  schema: {},
}))

describe('findUserAccountById', () => {
  it('calls db.query.financialAccount.findFirst with userId and accountId in the where', async () => {
    const findFirst = vi.fn().mockResolvedValue({
      id: 'acc-1',
      balanceCents: 10000,
    })
    const fakeDb = {
      query: {
        financialAccount: {
          findFirst,
        },
      },
    } as unknown as Parameters<typeof findUserAccountById>[0]

    const result = await findUserAccountById(fakeDb, 'user-1', 'acc-1')

    expect(result).toEqual({ id: 'acc-1', balanceCents: 10000 })
    expect(findFirst).toHaveBeenCalledOnce()
  })

  it('returns undefined when the account does not belong to the user', async () => {
    const findFirst = vi.fn().mockResolvedValue(undefined)
    const fakeDb = {
      query: {
        financialAccount: {
          findFirst,
        },
      },
    } as unknown as Parameters<typeof findUserAccountById>[0]

    const result = await findUserAccountById(fakeDb, 'user-2', 'acc-1')

    expect(result).toBeUndefined()
  })
})
