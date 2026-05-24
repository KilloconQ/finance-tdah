import type { Db, Tx } from '../../../db/client'

export async function findUserAccountById(
  db: Db | Tx,
  userId: string,
  accountId: string,
) {
  return db.query.financialAccount.findFirst({
    where: (a, { and, eq }) => and(eq(a.id, accountId), eq(a.userId, userId)),
    columns: { id: true, balanceCents: true },
  })
}
