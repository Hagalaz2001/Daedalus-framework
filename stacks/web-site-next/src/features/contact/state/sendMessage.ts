'use server'

import { emptyContact, validateContact, type ContactState } from '../model/validate'

/**
 * Server action behind the contact form. Validation runs here too (never trust the browser).
 * Delivery: POSTs JSON to CONTACT_WEBHOOK_URL (a form service, chat webhook or your backend). Without it the form
 * answers with a visible "not connected" error instead of pretending the message was sent.
 * The OpenAPI contract has no contact operation; add one and call the generated client here when the backend should own it.
 */
export async function sendMessage(_prev: ContactState, form: FormData): Promise<ContactState> {
  const values = { name: String(form.get('name') ?? ''), email: String(form.get('email') ?? ''), message: String(form.get('message') ?? '') }
  const errors = validateContact(values)
  if (Object.keys(errors).length) return { status: 'error', errors, values }

  const hook = process.env['CONTACT_WEBHOOK_URL']
  if (!hook) {
    console.error('[contact] CONTACT_WEBHOOK_URL is not set: the message was NOT delivered')
    return { status: 'error', errors: {}, values, message: 'The contact form is not connected yet. Please email us instead.' }
  }
  try {
    const res = await fetch(hook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(values), signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(String(res.status))
    return { ...emptyContact, status: 'success' }
  } catch {
    return { status: 'error', errors: {}, values, message: 'We could not send that just now. Please try again in a minute.' }
  }
}
