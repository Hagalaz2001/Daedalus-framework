import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expectNoA11yViolations } from '@app/ui/testing'
import { validateContact } from './lib/contact'
import ContactForm from './islands/react/ContactForm'
import PricingTable from './islands/react/PricingTable'
import SiteMenu from './islands/react/SiteMenu'

describe('PricingTable island', () => {
  it('switches between yearly and monthly prices and has no a11y violations', async () => {
    const { container } = render(<PricingTable />)
    expect(screen.getByRole('heading', { name: 'Pro' }).closest('section')).toHaveTextContent('$7')
    await userEvent.click(screen.getByRole('radio', { name: 'Monthly' }))
    expect(screen.getByRole('heading', { name: 'Pro' }).closest('section')).toHaveTextContent('$9')
    await expectNoA11yViolations(container)
  })
})

describe('ContactForm island', () => {
  it('shows field errors, then the success state', async () => {
    const send = vi.fn(async () => ({ ok: true as const }))
    render(<ContactForm endpoint="https://forms.example.com/x" send={send} />)
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }))
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(send).not.toHaveBeenCalled()
    await userEvent.type(screen.getByLabelText('Name'), 'Ada')
    await userEvent.type(screen.getByLabelText('Email'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('How can we help?'), 'Do you export to Markdown?')
    expect(validateContact({ name: 'Ada', email: 'user@example.com', message: 'Do you export to Markdown?' })).toEqual({})
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Message sent')
    expect(send).toHaveBeenCalledWith({ name: 'Ada', email: 'user@example.com', message: 'Do you export to Markdown?' }, 'https://forms.example.com/x')
  })

  it('shows a delivery error', async () => {
    const send = vi.fn(async () => ({ ok: false as const, message: 'We could not send that just now.' }))
    render(<ContactForm endpoint="https://x.example.com" send={send} />)
    await userEvent.type(screen.getByLabelText('Name'), 'Ada')
    await userEvent.type(screen.getByLabelText('Email'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('How can we help?'), 'Hello there, quick question.')
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('could not send')
  })
})

describe('SiteMenu island', () => {
  it('opens a sheet with the navigation links', async () => {
    render(<SiteMenu appUrl="https://app.example.com" nav={[{ href: '/pricing', label: 'Pricing', current: true }]} />)
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }))
    expect(await screen.findByRole('link', { name: 'Pricing' })).toHaveAttribute('aria-current', 'page')
  })
})
