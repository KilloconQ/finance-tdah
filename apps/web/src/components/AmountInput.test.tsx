import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { AmountInput } from './AmountInput'

function Harness({ initial = '' }: { initial?: string }) {
  const [v, setV] = useState(initial)
  return <AmountInput aria-label="Monto" value={v} onChange={setV} />
}

describe('AmountInput', () => {
  it('inserts thousands commas while typing', async () => {
    render(<Harness />)
    const input = screen.getByLabelText('Monto') as HTMLInputElement
    await userEvent.setup().type(input, '1234567.5')
    expect(input.value).toBe('1,234,567.5')
  })

  it('shows an initial plain value with commas', () => {
    render(<Harness initial="1234.50" />)
    expect((screen.getByLabelText('Monto') as HTMLInputElement).value).toBe('1,234.50')
  })

  it('deleting a digit keeps the grouping', async () => {
    render(<Harness initial="1234" />)
    const input = screen.getByLabelText('Monto') as HTMLInputElement
    await userEvent.setup().type(input, '{Backspace}')
    expect(input.value).toBe('123')
  })
})
