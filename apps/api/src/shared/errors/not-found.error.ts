import { DomainError } from './domain-error'

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND'
  readonly status = 404

  constructor(message = 'Resource not found') {
    super(message)
  }
}
