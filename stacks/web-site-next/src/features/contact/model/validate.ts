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

export interface ContactState {
  status: 'idle' | 'success' | 'error'
  errors: ContactErrors
  message?: string
  values: ContactInput
}

export const emptyContact: ContactState = { status: 'idle', errors: {}, values: { name: '', email: '', message: '' } }
