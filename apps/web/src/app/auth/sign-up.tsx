import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { AppBar, Btn, Hello, PhoneShell } from '@/components'
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
    <PhoneShell>
      <AppBar title="Crear cuenta" />
      <form
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col px-7 pb-6 pt-2"
      >
        <h1 className="mt-4 text-[24px] font-medium leading-tight text-ink">
          Vamos a empezar
        </h1>
        <Hello className="mt-2">Solo lo mínimo para arrancar.</Hello>

        <div className="mt-5 flex flex-col gap-3">
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
          <p className="text-[11px] text-ink-soft">Mínimo 8 caracteres.</p>
        </div>

        {error ? (
          <div className="mt-3 rounded-[10px] bg-danger-bg px-3 py-2 text-[13px] text-danger">
            {error}
          </div>
        ) : null}

        <div className="flex-1" />

        <Btn
          kind="primary"
          className="w-full py-4"
          type="submit"
          disabled={loading || !email || password.length < 8 || !name}
        >
          {loading ? 'Creando…' : 'Crear cuenta'}
        </Btn>
        <div className="mt-4 text-center text-[13px] text-ink-mid">
          ¿Ya tenés cuenta?{' '}
          <Link to="/auth/sign-in" className="text-ink underline">
            Entrar
          </Link>
        </div>
      </form>
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
      <div className="wf-mono text-[11px] uppercase tracking-[0.08em] text-ink-mid">
        {label}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        className="mt-1.5 w-full rounded-[10px] border border-line bg-surface px-4 py-3 text-[15px] text-ink focus:border-ink focus:outline-none"
      />
    </label>
  )
}
