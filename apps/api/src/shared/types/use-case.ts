import type { Db } from '../../db/client'
import type { Logger } from '../../lib/logger'

export type UseCaseDeps = {
  db: Db
  userId: string
  logger?: Logger
}

export type UseCase<TInput, TOutput> = (
  deps: UseCaseDeps,
  input: TInput,
) => Promise<TOutput>
