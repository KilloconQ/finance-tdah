import { DomainError } from './domain-error'

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR'
  readonly status = 422

  constructor(message = 'Validation error') {
    super(message)
  }
}
