export const MIN_PASSWORD = 8

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface FieldErrors {
  name?: string
  email?: string
  password?: string
}

export function validateCredentials(v: { name?: string; email: string; password: string }, mode: 'sign-in' | 'sign-up'): FieldErrors {
  const errors: FieldErrors = {}
  if (!EMAIL.test(v.email.trim())) errors.email = 'Enter an email like name@example.com.'
  if (!v.password) errors.password = 'Enter your password.'
  else if (mode === 'sign-up' && v.password.length < MIN_PASSWORD) errors.password = `Use at least ${MIN_PASSWORD} characters.`
  if (mode === 'sign-up' && !v.name?.trim()) errors.name = 'Tell us what to call you.'
  return errors
}

export const validateEmail = (email: string): string | undefined => (EMAIL.test(email.trim()) ? undefined : 'Enter an email like name@example.com.')
