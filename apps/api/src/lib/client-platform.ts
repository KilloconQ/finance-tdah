import { clientPlatformSchema, type ClientPlatform } from '@finance-tdah/shared/schemas'

/** The app says which client it is with `X-Client-Platform`; browsers and anything unknown count as web. */
export function clientPlatform(header: string | undefined): ClientPlatform {
  const parsed = clientPlatformSchema.safeParse(header)
  return parsed.success ? parsed.data : 'web'
}
