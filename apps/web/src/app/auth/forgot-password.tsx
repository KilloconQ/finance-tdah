import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Btn, Card, Hello, PhoneShell } from '@/components'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/auth/forgot-password')({
  component: ForgotPassword,
})

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (result.error) {
        setError(result.error.message ?? 'No pudimos procesar el pedido')
        return
      }
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PhoneShell variant="narrow">
      <div className="flex flex-1 flex-col justify-center py-8">
        <Card className="p-6 sm:p-7">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">¿Olvidaste tu contraseña?</h1>
          <Hello className="mt-2">Te mandamos un link para restablecerla.</Hello>

          {sent ? (
            <div className="mt-6 rounded-xl bg-surface px-3 py-3 text-sm text-ink-mid">
              Si ese email existe, te mandamos un link para restablecer tu contraseña.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
              <Field
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={setEmail}
                required
              />

              {error ? (
                <div className="rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger">
                  {error}
                </div>
              ) : null}

              <Btn kind="primary" className="mt-2 w-full" type="submit" disabled={loading || !email}>
                {loading ? 'Enviando…' : 'Enviar link'}
              </Btn>
            </form>
          )}

          <div className="mt-5 text-center text-sm text-ink-mid">
            <Link to="/auth/sign-in" className="font-medium text-accent-strong underline">
              Volver a entrar
            </Link>
          </div>
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
