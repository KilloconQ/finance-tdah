import { z } from 'zod'
import { cents, isoDate, isoDateTime } from './common'

const positiveCents = cents.positive({ error: 'El monto debe ser mayor a 0' })

export const groupMemberSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
})

export const expenseGroupSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  createdBy: z.string(),
  createdAt: isoDateTime,
  members: z.array(groupMemberSchema),
  /** The signed-in user's net balance in this group: positive = is owed, negative = owes. */
  myBalanceCents: z.number().int(),
})

export const createGroupSchema = z.object({
  name: z.string().trim().min(1, { error: 'El grupo necesita un nombre' }).max(80),
})

export const addMemberSchema = z.object({
  email: z.email({ error: 'Email inválido' }).transform((e) => e.toLowerCase()),
})

export const shareSchema = z.object({
  userId: z.string(),
  shareCents: cents,
})

export const sharedExpenseSchema = z.object({
  id: z.uuid(),
  groupId: z.uuid(),
  paidBy: z.string(),
  description: z.string(),
  amountCents: z.number().int(),
  date: isoDate,
  createdBy: z.string(),
  createdAt: isoDateTime,
  splits: z.array(shareSchema),
})

/** Omit `splits` to split equally among `participantIds`; send `splits` for custom amounts. */
export const createSharedExpenseSchema = z
  .object({
    paidBy: z.string(),
    description: z.string().trim().min(1, { error: 'Falta la descripción' }).max(120),
    amountCents: positiveCents,
    date: isoDate,
    participantIds: z.array(z.string()).min(1).optional(),
    splits: z.array(shareSchema).min(1).optional(),
  })
  .refine((v) => v.participantIds || v.splits, { error: 'Indicá con quién se divide el gasto' })
  .refine((v) => !v.splits || v.splits.reduce((n, s) => n + s.shareCents, 0) === v.amountCents, {
    error: 'Las partes deben sumar el monto total',
  })

export const createSettlementSchema = z
  .object({
    fromUserId: z.string(),
    toUserId: z.string(),
    amountCents: positiveCents,
    date: isoDate,
  })
  .refine((v) => v.fromUserId !== v.toUserId, { error: 'No podés pagarte a vos mismo' })

export const settlementSchema = z.object({
  id: z.uuid(),
  groupId: z.uuid(),
  fromUserId: z.string(),
  toUserId: z.string(),
  amountCents: z.number().int(),
  date: isoDate,
  createdAt: isoDateTime,
})

export const groupBalancesSchema = z.object({
  balances: z.record(z.string(), z.number().int()),
  debts: z.array(z.object({ from: z.string(), to: z.string(), amountCents: z.number().int() })),
})

export type ExpenseGroupDTO = z.infer<typeof expenseGroupSchema>
export type SharedExpenseDTO = z.infer<typeof sharedExpenseSchema>
export type SettlementDTO = z.infer<typeof settlementSchema>
export type GroupBalancesDTO = z.infer<typeof groupBalancesSchema>
export type CreateSharedExpenseInput = z.input<typeof createSharedExpenseSchema>

export const groupListSchema = z.object({ groups: z.array(expenseGroupSchema) })

export const groupDetailSchema = z.object({
  group: expenseGroupSchema,
  expenses: z.array(sharedExpenseSchema),
  settlements: z.array(settlementSchema),
  balances: groupBalancesSchema,
})
export type GroupDetailDTO = z.infer<typeof groupDetailSchema>
