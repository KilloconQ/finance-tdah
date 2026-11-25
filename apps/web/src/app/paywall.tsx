import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { Purchases, type Package } from '@revenuecat/purchases-js'
import { AppBar, Btn, Hello, PhoneShell } from '@/components'
import { errorText } from '@/lib/api'
import { billingStatusQuery } from '@/lib/queries'
import { queryClient } from '@/lib/query-client'
import { getSession } from '@/lib/session'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/paywall')({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) throw redirect({ to: '/auth/sign-in' })
    // Nothing to pay for (dev/local, allowlist, already subscribed): never show this screen.
    const billing = await queryClient.fetchQuery({ ...billingStatusQuery(), staleTime: 0 })
    if (billing.hasAccess) throw redirect({ to: '/' })
    return { userId: session.user.id }
  },
  component: Paywall,
})

/** The webhook can land a few seconds after checkout: wait for it instead of bouncing back here. */
async function waitForAccess(): Promise<boolean> {
  for (let i = 0; i < 10; i++) {
    const billing = await queryClient.fetchQuery({ ...billingStatusQuery(), staleTime: 0 })
    if (billing.hasAccess) return true
    await new Promise((r) => setTimeout(r, 1500))
  }
  return false
}

function Paywall() {
  const { userId } = Route.useRouteContext()
  const navigate = useNavigate()
  const apiKey = import.meta.env.VITE_REVENUECAT_WEB_KEY
  const [busy, setBusy] = useState(false)
  const [buyError, setBuyError] = useState<string | null>(null)

  const offerings = useQuery({
    queryKey: ['revenuecat', 'offerings', userId],
    enabled: Boolean(apiKey),
    retry: false,
    queryFn: async () => {
      // The app user id is OUR user id: that is what the webhook maps back to an account.
      const purchases = Purchases.isConfigured() ? Purchases.getSharedInstance() : Purchases.configure({ apiKey, appUserId: userId })
      if (purchases.getAppUserId() !== userId) await purchases.changeUser(userId)
      return (await purchases.getOfferings()).current?.availablePackages ?? []
    },
  })
  const packages = offerings.data
  const error = !apiKey
    ? 'El cobro no está configurado todavía.'
    : (buyError ?? (offerings.isError ? errorText(offerings.error, 'No pudimos cargar los planes') : null))

  const buy = async (rcPackage: Package) => {
    if (busy) return
    setBusy(true)
    setBuyError(null)
    try {
      await Purchases.getSharedInstance().purchase({ rcPackage })
      if (await waitForAccess()) navigate({ to: '/', replace: true })
      else setBuyError('Tu pago está en proceso. Vuelve a abrir la app en un minuto.')
    } catch (err) {
      setBuyError(errorText(err, 'No pudimos completar el pago'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <PhoneShell variant="narrow">
      <AppBar
        right={
          <button type="button" className="text-[13px] text-ink-mid" onClick={() => authClient.signOut().then(() => navigate({ to: '/auth/sign-in' }))}>
            Salir
          </button>
        }
      />
      <div className="flex flex-1 flex-col px-7 pb-6 pt-2">
        <h1 className="mt-6 text-center text-[26px] font-medium leading-tight text-ink">Sigue con Cada Quien</h1>
        <Hello className="mx-auto mt-3 max-w-[280px] text-center">Elige un plan para seguir usando la app.</Hello>
        <div className="mt-8 space-y-3">
          {packages?.map((pkg) => (
            <Btn key={pkg.identifier} kind="primary" className="w-full py-4" disabled={busy} onClick={() => buy(pkg)}>
              {pkg.webBillingProduct.title} · {pkg.webBillingProduct.price.formattedPrice}
            </Btn>
          ))}
          {packages?.length === 0 && <p className="text-center text-[13px] text-ink-mid">No hay planes disponibles por ahora.</p>}
        </div>
        {error && (
          <p role="alert" className="mt-4 text-center text-[13px] text-danger">
            {error}
          </p>
        )}
      </div>
    </PhoneShell>
  )
}
