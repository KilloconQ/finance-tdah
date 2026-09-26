import {
  ErrorComponent,
  Link,
  useRouter,
  type ErrorComponentProps,
} from '@tanstack/react-router'
import { Btn, Card, Hello, PhoneShell } from '@/components'
import { SessionCheckError } from '@/lib/session'

/**
 * `_app`'s error screen. A failed session check (429, 5xx, offline) lands here
 * with a retry instead of being treated as "signed out".
 */
export function AppError({ error }: ErrorComponentProps) {
  const router = useRouter()
  // Errors from child routes bubble up here too; those keep the default screen.
  if (!(error instanceof SessionCheckError)) return <ErrorComponent error={error} />

  return (
    <PhoneShell variant="narrow">
      <div className="flex flex-1 flex-col justify-center py-8">
        <Card className="p-6 sm:p-7">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            No pudimos comprobar tu sesión
          </h1>
          <Hello className="mt-2">{error.message}</Hello>
          <div className="mt-6 flex flex-col gap-3">
            <Btn kind="primary" onClick={() => router.invalidate()}>
              Reintentar
            </Btn>
            <Link
              to="/auth/sign-in"
              className="text-center text-sm text-ink-mid underline underline-offset-2"
            >
              Ir a iniciar sesión
            </Link>
          </div>
        </Card>
      </div>
    </PhoneShell>
  )
}
