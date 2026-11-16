import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { validateCredentials } from './model/validation'

// A plain function, not vi.fn: vitest reports a vi.fn that throws as a test failure even when the code under test catches it.
let impl: (...a: unknown[]) => unknown = () => undefined
const signInEmail = { mockReset: () => void (impl = () => undefined), mockResolvedValue: (v: unknown) => void (impl = () => Promise.resolve(v)), mockThrow: () => void (impl = () => { throw new TypeError('failed') }), calls: 0 }
vi.mock('./data/authClient', () => ({
  authClient: { signIn: { email: (...a: unknown[]) => { signInEmail.calls++; return impl(...a) } }, signOut: vi.fn(), updateUser: vi.fn() },
}))
vi.mock('@/shared/lib/token', () => ({ token: { get: vi.fn(() => 'tok'), set: vi.fn(), clear: vi.fn() } }))

import { SignInScreen } from './ui/SignInScreen'

const renderIt = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <SignInScreen />
      </MemoryRouter>
    </QueryClientProvider>,
  )

async function fillAndSubmit() {
  await userEvent.type(screen.getByLabelText('Email'), 'maya@example.com')
  await userEvent.type(screen.getByLabelText('Password'), 'wrong-pass')
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('validateCredentials', () => {
  it('flags a bad email and an empty password', () => {
    expect(validateCredentials({ email: 'nope', password: '' }, 'sign-in')).toEqual({
      email: 'Enter an email like name@example.com.',
      password: 'Enter your password.',
    })
    expect(validateCredentials({ email: 'user@example.com', password: 'x' }, 'sign-in')).toEqual({})
  })
})

describe('SignInScreen', () => {
  beforeEach(() => {
    signInEmail.mockReset()
    signInEmail.calls = 0
  })

  it('does not call the server with invalid input', async () => {
    renderIt()
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(signInEmail.calls).toBe(0)
    expect(await screen.findAllByText(/Enter/)).not.toHaveLength(0)
  })

  it('shows the server error', async () => {
    signInEmail.mockResolvedValue({ error: { message: 'Invalid email or password' } })
    renderIt()
    await fillAndSubmit()
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password'))
  })

  it('says so when the server cannot be reached', async () => {
    signInEmail.mockThrow()
    renderIt()
    await fillAndSubmit()
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Cannot reach the server'))
  })
})
