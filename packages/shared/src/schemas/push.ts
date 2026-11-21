import { z } from 'zod'

export const pushSubscribeSchema = z.object({
  endpoint: z.url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})

export const pushUnsubscribeSchema = z.object({
  endpoint: z.url(),
})

// Native (APNs) devices. A token is 32 bytes today, written as 64 hex characters; Apple has said it can grow,
// so the length is a range, not a constant.
export const apnsEnvironmentSchema = z.enum(['sandbox', 'production'])

export const registerDeviceSchema = z.object({
  token: z.string().regex(/^[0-9a-fA-F]{64,400}$/, { error: 'Token de dispositivo inválido' }),
  environment: apnsEnvironmentSchema,
})

export const unregisterDeviceSchema = z.object({
  token: z.string().regex(/^[0-9a-fA-F]{64,400}$/, { error: 'Token de dispositivo inválido' }),
})

export type PushSubscribeInput = z.infer<typeof pushSubscribeSchema>
export type PushUnsubscribeInput = z.infer<typeof pushUnsubscribeSchema>
export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>
export type UnregisterDeviceInput = z.infer<typeof unregisterDeviceSchema>
