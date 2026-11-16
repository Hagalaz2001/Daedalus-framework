import { sendContact, validateContact } from './contact'
import { faqs, plans } from './content'
import { absoluteUrl, fullTitle, jsonLd, siteGraph } from './seo'

describe('contact', () => {
  it('validates input', () => {
    expect(validateContact({ name: '', email: 'x', message: 'short' })).toEqual({
      name: 'Tell us your name.',
      email: 'Enter an email like name@example.com.',
      message: 'A sentence or two helps us answer properly.',
    })
    expect(validateContact({ name: 'Ada', email: 'user@example.com', message: 'Do you export to Markdown?' })).toEqual({})
  })

  const input = { name: 'Ada', email: 'user@example.com', message: 'Do you export to Markdown?' }
  it('posts JSON to the endpoint', async () => {
    const fetcher = vi.fn(async () => new Response('{}', { status: 200 }))
    expect(await sendContact(input, 'https://forms.example.com/x', fetcher as unknown as typeof fetch)).toEqual({ ok: true })
    expect(fetcher).toHaveBeenCalledWith('https://forms.example.com/x', expect.objectContaining({ method: 'POST', body: JSON.stringify(input) }))
  })
  it('explains when there is no endpoint, and on HTTP or network failure', async () => {
    expect(await sendContact(input, '')).toMatchObject({ ok: false, message: expect.stringContaining('not connected') })
    const bad = vi.fn(async () => new Response('', { status: 500 }))
    expect(await sendContact(input, 'https://x.example.com', bad as unknown as typeof fetch)).toMatchObject({ ok: false })
    const down = vi.fn(async () => Promise.reject(new Error('offline')))
    expect(await sendContact(input, 'https://x.example.com', down as unknown as typeof fetch)).toMatchObject({ ok: false })
  })
})

describe('seo helpers', () => {
  it('builds absolute URLs, titles and the site graph', () => {
    expect(absoluteUrl('/pricing', 'https://example.com')).toBe('https://example.com/pricing')
    expect(fullTitle('Pricing')).toMatch(/^Pricing \| /)
    const g = siteGraph('https://example.com')
    expect(g['@graph'].map((n) => n['@type'])).toEqual(['Organization', 'WebSite'])
  })
  it('JSON-LD escapes "<" so strings cannot close the script tag', () => {
    expect(jsonLd({ name: '</script><b>x' })).not.toContain('</script>')
  })
})

describe('marketing content', () => {
  it('has three plans with one featured, and FAQs with answers', () => {
    expect(plans).toHaveLength(3)
    expect(plans.filter((p) => p.featured)).toHaveLength(1)
    expect(faqs.every((f) => f.q && f.a)).toBe(true)
  })
})
