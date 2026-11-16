import { Button, Field, Input, Textarea } from '@app/ui'
import { CheckCircle2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { sendContact, validateContact, type ContactErrors } from '../../lib/contact'

export default function ContactForm({ endpoint, send = sendContact }: { endpoint: string; send?: typeof sendContact }) {
  const [values, setValues] = useState({ name: '', email: '', message: '' })
  const [errors, setErrors] = useState<ContactErrors>({})
  const [failure, setFailure] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const set = (k: keyof typeof values) => (e: { target: { value: string } }) => setValues({ ...values, [k]: e.target.value })

  async function submit(e: FormEvent) {
    e.preventDefault()
    const found = validateContact(values)
    setErrors(found)
    setFailure(null)
    if (Object.keys(found).length) return
    setBusy(true)
    const result = await send(values, endpoint)
    setBusy(false)
    if (result.ok) setSent(true)
    else setFailure(result.message)
  }

  if (sent)
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
    <form onSubmit={submit} noValidate className="space-y-5">
      <Field label="Name" error={errors.name}>
        {(p) => <Input {...p} name="name" autoComplete="name" value={values.name} onChange={set('name')} />}
      </Field>
      <Field label="Email" error={errors.email}>
        {(p) => <Input {...p} name="email" type="email" autoComplete="email" value={values.email} onChange={set('email')} />}
      </Field>
      <Field label="How can we help?" error={errors.message}>
        {(p) => <Textarea {...p} name="message" rows={6} value={values.message} onChange={set('message')} />}
      </Field>
      {failure && (
        <p role="alert" className="rounded-md border border-danger/35 bg-danger/6 px-3 py-2.5 text-sm font-medium text-danger">
          {failure}
        </p>
      )}
      <Button type="submit" size="lg" loading={busy}>
        Send message
      </Button>
    </form>
  )
}
