import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderScreen } from '@/test-utils'
import { validateCredentials } from './model/validation'
import { SignInScreen } from './ui/SignInScreen'

const signIn = vi.fn()
vi.mock('./state/useAuthActions', () => ({ useAuthActions: () => ({ signIn }) }))

describe('credentials', () => {
  it('validates sign-up fields', () => {
    expect(validateCredentials({ name: '', email: 'nope', password: 'short' }, 'sign-up')).toEqual({
      name: 'Tell us what to call you.',
      email: 'Enter an email like name@example.com.',
      password: 'Use at least 8 characters.',
    })
    expect(validateCredentials({ email: 'user@example.com', password: 'x' }, 'sign-in')).toEqual({})
  })
})

describe('SignInScreen', () => {
  beforeEach(() => signIn.mockReset())

  it('blocks an empty submit and points at the fields', async () => {
    renderScreen(<SignInScreen />)
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(signIn).not.toHaveBeenCalled()
  })

  it('shows the server error when sign-in fails', async () => {
    signIn.mockResolvedValue('Invalid email or password')
    renderScreen(<SignInScreen />)
    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-password')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
    expect(signIn).toHaveBeenCalledWith('ada@example.com', 'wrong-password')
  })
})
