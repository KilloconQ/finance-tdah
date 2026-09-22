import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Btn, Card, Hello, PhoneShell } from '@/components'
import { authClient } from '@/lib/auth-client'
import { authErrorMessage, thrownErrorMessage } from '@/lib/auth-errors'

export const Route = createFileRoute('/auth/reset-password')({
  component: ResetPassword,
})

function ResetPassword() {
  const navigate = useNavigate()
  const token = new URLSearchParams(window.location.search).get('token')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const result = await authClient.resetPassword({ newPassword: password, token })
      if (result.error) {
        setError(authErrorMessage(result.error, 'No pudimos restablecer tu contraseña'))
        return
      }
      navigate({ to: '/auth/sign-in', replace: true })
    } catch (err) {
      setError(thrownErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <PhoneShell variant="narrow">
        <div className="flex flex-1 flex-col justify-center py-8">
          <Card className="p-6 sm:p-7">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Link inválido o vencido.</h1>
            <Hello className="mt-2">Pedí un nuevo link para restablecer tu contraseña.</Hello>

            <div className="mt-5 text-center text-sm text-ink-mid">
              <Link to="/auth/forgot-password" className="font-medium text-accent-strong underline">
                Pedir link nuevo
              </Link>
            </div>
          </Card>
        </div>
      </PhoneShell>
    )
  }

  return (
    <PhoneShell variant="narrow">
      <div className="flex flex-1 flex-col justify-center py-8">
        <Card className="p-6 sm:p-7">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Nueva contraseña</h1>
          <Hello className="mt-2">Elegí una contraseña nueva.</Hello>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
            <Field
              label="Contraseña nueva"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
              required
            />
            <p className="text-xs text-ink-soft">Mínimo 8 caracteres.</p>

            {error ? (
              <div className="rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger">
                {error}
              </div>
            ) : null}

            <Btn
              kind="primary"
              className="mt-2 w-full"
              type="submit"
              disabled={loading || password.length < 8}
            >
              {loading ? 'Guardando…' : 'Restablecer contraseña'}
            </Btn>
          </form>
        </Card>
      </div>
    </PhoneShell>
  )
}

interface FieldProps {
  label: string
  type: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  autoComplete?: string
}

function Field({ label, type, value, onChange, required, autoComplete }: FieldProps) {
  return (
    <label className="block">
      <div className="mb-1.5 text-sm font-medium text-ink-mid">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-[15px] text-ink outline-none transition-colors focus:border-accent"
      />
    </label>
  )
}
