import { Button, TextField } from '@app/ui'
import { MailCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { validateEmail } from '../model/validation'
import { useAuthActions } from '../state/useAuthActions'
import { AuthLayout } from './AuthLayout'

export function ForgotPasswordScreen() {
  const { requestPasswordReset } = useAuthActions()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const invalid = validateEmail(email)
    setError(invalid ?? null)
    if (invalid) return
    setBusy(true)
    const failure = await requestPasswordReset(email)
    setBusy(false)
    if (failure) setError(failure)
    else setSent(true)
  }

  const back = (
    <Link to="/sign-in" className="font-medium text-primary underline underline-offset-4">
      Back to sign in
    </Link>
  )

  if (sent)
    return (
      <AuthLayout title="Check your inbox" subtitle={`If an account exists for ${email.trim()}, a reset link is on its way.`} footer={back}>
        <div role="status" className="flex items-center gap-3 rounded-md border border-border bg-surface-muted p-4 text-sm">
          <MailCheck className="size-5 shrink-0 text-success" aria-hidden />
          The link expires in one hour.
        </div>
      </AuthLayout>
    )

  return (
    <AuthLayout title="Reset your password" subtitle="Enter your email and we will send you a link." footer={back}>
      <form className="space-y-5" onSubmit={submit} noValidate>
        <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Send reset link
        </Button>
      </form>
    </AuthLayout>
  )
}
