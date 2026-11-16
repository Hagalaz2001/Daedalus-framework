import { Button, TextField } from '@app/ui'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { MIN_PASSWORD, validateCredentials, type FieldErrors } from '../model/validation'
import { useAuthActions } from '../state/useAuthActions'
import { AuthLayout } from './AuthLayout'

export function SignUpScreen() {
  const { signUp } = useAuthActions()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const found = validateCredentials({ name, email, password }, 'sign-up')
    setErrors(found)
    setFormError(null)
    if (Object.keys(found).length) return
    setBusy(true)
    const error = await signUp(name, email, password)
    setBusy(false)
    if (error) setFormError(error)
    else void navigate('/welcome')
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Free to start. No card needed."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/sign-in" className="font-medium text-primary underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={submit} noValidate>
        <TextField label="Name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
        <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD} characters.`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        {formError && (
          <p role="alert" className="rounded-md border border-danger/35 bg-danger/6 px-3 py-2.5 text-sm font-medium text-danger">
            {formError}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  )
}
