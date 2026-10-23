import { Link, type ErrorComponentProps } from '@tanstack/react-router'
import { Card } from './Card'
import { Hello } from './Hello'
import { PhoneShell } from './PhoneShell'
import { thrownErrorMessage } from '@/lib/auth-errors'

function Screen({ title, message }: { title: string; message: string }) {
  return (
    <PhoneShell variant="narrow">
      <div className="flex flex-1 flex-col justify-center py-8">
        <Card className="p-6 sm:p-7">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          <Hello className="mt-2">{message}</Hello>
          <Link
            to="/"
            className="wf-tap mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl border border-accent bg-accent px-4 text-sm font-medium text-surface"
          >
            Volver al inicio
          </Link>
        </Card>
      </div>
    </PhoneShell>
  )
}

/** Shown for unknown URLs and ids that point at nothing. */
export function NotFoundScreen() {
  return <Screen title="No encontramos esa página" message="Puede que el link esté mal escrito o que ya no exista." />
}

/** Shown when a route fails to load or render. */
export function RouteErrorScreen({ error }: ErrorComponentProps) {
  return <Screen title="Algo salió mal" message={thrownErrorMessage(error, 'Intenta de nuevo en un momento.')} />
}
