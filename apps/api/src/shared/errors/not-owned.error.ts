import { DomainError } from './domain-error'

export class NotOwnedError extends DomainError {
  readonly code = 'NOT_OWNED'
  readonly status = 403

  constructor(message = 'Access denied') {
    super(message)
  }
}
