export interface ContactInput {
  name: string
  email: string
  message: string
}
export type ContactErrors = Partial<Record<keyof ContactInput, string>>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateContact(v: ContactInput): ContactErrors {
  const e: ContactErrors = {}
  if (!v.name.trim()) e.name = 'Tell us your name.'
  if (!EMAIL.test(v.email.trim())) e.email = 'Enter an email like name@example.com.'
  if (v.message.trim().length < 10) e.message = 'A sentence or two helps us answer properly.'
  else if (v.message.length > 4000) e.message = 'Keep it under 4000 characters.'
  return e
}

export type SendResult = { ok: true } | { ok: false; message: string }

/**
 * Posts the message as JSON to the configured endpoint. The static site has no server of its own, so the
 * endpoint is a form service, a chat webhook or your backend (PUBLIC_CONTACT_ENDPOINT). Network and HTTP failures
 * come back as a readable message instead of throwing.
 */
export async function sendContact(v: ContactInput, endpoint: string, fetcher: typeof fetch = fetch): Promise<SendResult> {
  if (!endpoint) return { ok: false, message: 'The contact form is not connected yet. Please email us instead.' }
  try {
    const res = await fetcher(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(v) })
    if (!res.ok) throw new Error(String(res.status))
    return { ok: true }
  } catch {
    return { ok: false, message: 'We could not send that just now. Please try again in a minute.' }
  }
}
