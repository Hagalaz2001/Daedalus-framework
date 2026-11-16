import { Button, TextField } from '@app/ui'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { validateCredentials, type FieldErrors } from '../model/validation'
import { useAuthActions } from '../state/useAuthActions'
import { AuthLayout } from './AuthLayout'

export function SignInScreen() {
  const { signIn } = useAuthActions()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const found = validateCredentials({ email, password }, 'sign-in')
    setErrors(found)
    setFormError(null)
    if (Object.keys(found).length) return
    setBusy(true)
    const error = await signIn(email, password)
    setBusy(false)
    if (error) setFormError(error)
    else void navigate('/')
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to pick up where you left off."
      footer={
        <>
          New here?{' '}
          <Link to="/sign-up" className="font-medium text-primary underline underline-offset-4">
            Create an account
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={submit} noValidate>
        <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <div className="-mt-2 text-right">
          <Link to="/forgot-password" className="text-sm font-medium text-primary underline underline-offset-4">
            Forgot password?
          </Link>
        </div>
        {formError && (
          <p role="alert" className="rounded-md border border-danger/35 bg-danger/6 px-3 py-2.5 text-sm font-medium text-danger">
            {formError}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  )
}
