'use client'

import { Button, Field, Input, Textarea } from '@app/ui'
import { CheckCircle2 } from 'lucide-react'
import { useActionState } from 'react'
import { emptyContact, type ContactState } from '../model/validate'
import { sendMessage } from '../state/sendMessage'

export function ContactForm({ action = sendMessage }: { action?: (prev: ContactState, form: FormData) => Promise<ContactState> }) {
  const [state, formAction, pending] = useActionState(action, emptyContact)

  if (state.status === 'success')
    return (
      <div role="status" className="flex items-start gap-4 rounded-lg border border-success/40 bg-success/8 p-6">
        <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-success" aria-hidden />
        <div>
          <p className="font-display text-xl font-semibold">Message sent</p>
          <p className="mt-1 text-text-muted">Thank you. We reply within two working days.</p>
        </div>
      </div>
    )

  return (
    <form action={formAction} noValidate className="space-y-5">
      <Field label="Name" error={state.errors.name}>
        {(p) => <Input {...p} name="name" autoComplete="name" defaultValue={state.values.name} />}
      </Field>
      <Field label="Email" error={state.errors.email}>
        {(p) => <Input {...p} name="email" type="email" autoComplete="email" defaultValue={state.values.email} />}
      </Field>
      <Field label="How can we help?" error={state.errors.message}>
        {(p) => <Textarea {...p} name="message" rows={6} defaultValue={state.values.message} />}
      </Field>
      {state.message && (
        <p role="alert" className="rounded-md border border-danger/35 bg-danger/6 px-3 py-2.5 text-sm font-medium text-danger">
          {state.message}
        </p>
      )}
      <Button type="submit" size="lg" loading={pending}>
        Send message
      </Button>
    </form>
  )
}
