import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expectNoA11yViolations } from '@app/ui/testing'
import { getAllPosts, getPost } from '@/features/blog'
import { ContactForm, validateContact, type ContactState } from '@/features/contact'
import { PricingTable } from '@/features/marketing'
import { pageMetadata } from '@/shared/lib/seo'
import { JsonLd } from '@/shared/ui/JsonLd'

vi.mock('next/link', () => ({ default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a> }))
// The real action is a 'use server' module; tests inject their own through the `action` prop.
vi.mock('@/features/contact/state/sendMessage', () => ({ sendMessage: vi.fn() }))

describe('blog content', () => {
  it('loads posts newest first and rejects unsafe slugs', () => {
    const posts = getAllPosts()
    expect(posts.length).toBeGreaterThanOrEqual(3)
    expect([...posts].sort((a, b) => b.date.localeCompare(a.date)).map((p) => p.slug)).toEqual(posts.map((p) => p.slug))
    expect(getPost(posts[0]!.slug)?.body.length).toBeGreaterThan(50)
    expect(getPost('../package')).toBeNull()
    expect(getPost('does-not-exist')).toBeNull()
  })
})

describe('seo helpers', () => {
  it('builds canonical + Open Graph metadata', () => {
    const m = pageMetadata({ title: 'Pricing', description: 'd', path: '/pricing' })
    expect(m.alternates?.canonical).toBe('/pricing')
    expect(m.openGraph).toMatchObject({ title: 'Pricing', type: 'website' })
  })
  it('JsonLd escapes "<" so strings cannot close the script tag', () => {
    const { container } = render(<JsonLd data={{ name: '</script><b>x' }} />)
    expect(container.querySelector('script')!.innerHTML).not.toContain('</script>')
  })
})

describe('PricingTable', () => {
  it('switches between yearly and monthly prices and has no a11y violations', async () => {
    const { container } = render(<PricingTable />)
    expect(screen.getByRole('heading', { name: 'Pro' }).closest('section')).toHaveTextContent('$7')
    await userEvent.click(screen.getByRole('radio', { name: 'Monthly' }))
    expect(screen.getByRole('heading', { name: 'Pro' }).closest('section')).toHaveTextContent('$9')
    await expectNoA11yViolations(container)
  })
})

describe('contact form', () => {
  it('validates input', () => {
    expect(validateContact({ name: '', email: 'x', message: 'short' })).toEqual({
      name: 'Tell us your name.',
      email: 'Enter an email like name@example.com.',
      message: 'A sentence or two helps us answer properly.',
    })
  })

  it('shows field errors, then the success state', async () => {
    const action = vi.fn(async (_p: ContactState, f: FormData): Promise<ContactState> => {
      const values = { name: String(f.get('name')), email: String(f.get('email')), message: String(f.get('message')) }
      const errors = validateContact(values)
      return Object.keys(errors).length ? { status: 'error', errors, values } : { status: 'success', errors: {}, values }
    })
    render(<ContactForm action={action} />)
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }))
    expect(await screen.findByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    await userEvent.type(screen.getByLabelText('Name'), 'Ada')
    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com')
    await userEvent.type(screen.getByLabelText('How can we help?'), 'Do you export to Markdown?')
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Message sent')
  })

  it('shows a delivery error from the server', async () => {
    const action = vi.fn(async (_p: ContactState, f: FormData): Promise<ContactState> => ({
      status: 'error', errors: {}, message: 'We could not send that just now.', values: { name: String(f.get('name')), email: '', message: '' },
    }))
    render(<ContactForm action={action} />)
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('could not send')
  })
})
