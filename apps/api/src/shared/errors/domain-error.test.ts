import { describe, it, expect } from 'vitest'
import { DomainError } from './domain-error'

// Concrete subclass for testing the abstract base
class TestError extends DomainError {
  readonly code = 'TEST_ERROR'
  readonly status = 400
  constructor() {
    super('Test error message')
  }
}

describe('DomainError', () => {
  it('sets the message correctly', () => {
    const err = new TestError()
    expect(err.message).toBe('Test error message')
  })

  it('sets name to the subclass constructor name', () => {
    const err = new TestError()
    expect(err.name).toBe('TestError')
  })

  it('is an instance of Error', () => {
    const err = new TestError()
    expect(err).toBeInstanceOf(Error)
  })

  it('is an instance of DomainError', () => {
    const err = new TestError()
    expect(err).toBeInstanceOf(DomainError)
  })

  it('exposes code and status from the subclass', () => {
    const err = new TestError()
    expect(err.code).toBe('TEST_ERROR')
    expect(err.status).toBe(400)
  })
})
