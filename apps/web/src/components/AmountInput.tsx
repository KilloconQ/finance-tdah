import type { ComponentProps } from 'react'
import { formatAmountInput } from '@/lib/format'

type AmountInputProps = Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'type'> & {
  value: string
  onChange: (value: string) => void
}

/** Money text field that inserts thousands commas as the user types. */
export function AmountInput({ value, onChange, ...rest }: AmountInputProps) {
  const shown = formatAmountInput(value, true)
  return (
    <input
      inputMode="decimal"
      autoComplete="off"
      {...rest}
      type="text"
      value={shown}
      onChange={(e) => onChange(formatAmountInput(e.target.value, e.target.value.length < shown.length))}
    />
  )
}
