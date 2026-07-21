import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Btn, Card, Hello, PhoneShell } from '@/components'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/auth/sign-up')({
  component: SignUp,
})

function SignUp() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await authClient.signUp.email({ email, password, name })
      if (result.error) {
        setError(result.error.message ?? 'No pudimos crear tu cuenta')
        return
      }
      navigate({ to: '/onboarding', replace: true })
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
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Vamos a empezar</h1>
          <Hello className="mt-2">Solo lo mínimo para arrancar.</Hello>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
            <Field label="Tu nombre" type="text" value={name} onChange={setName} required autoComplete="name" />
            <Field label="Email" type="email" value={email} onChange={setEmail} required autoComplete="email" />
            <Field
              label="Contraseña"
              type="password"
              value={password}
              onChange={setPassword}
              required
              autoComplete="new-password"
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
              disabled={loading || !email || password.length < 8 || !name}
            >
              {loading ? 'Creando…' : 'Crear cuenta'}
            </Btn>
          </form>

          <div className="mt-5 text-center text-sm text-ink-mid">
            ¿Ya tenés cuenta?{' '}
            <Link to="/auth/sign-in" className="font-medium text-accent-strong underline">
              Entrar
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
