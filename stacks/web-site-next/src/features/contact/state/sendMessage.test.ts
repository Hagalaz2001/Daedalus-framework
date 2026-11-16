import { afterEach, describe, expect, it, vi } from 'vitest'
import { emptyContact } from '../model/validate'
import { sendMessage } from './sendMessage'

const form = () => {
  const f = new FormData()
  f.set('name', 'Ada')
  f.set('email', 'ada@example.com')
  f.set('message', 'Hello, I would like a quote please.')
  return f
}

describe('sendMessage', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('reports an error, not success, when CONTACT_WEBHOOK_URL is not set', async () => {
    vi.stubEnv('CONTACT_WEBHOOK_URL', '')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const r = await sendMessage(emptyContact, form())
    expect(r.status).toBe('error')
    expect(r.message).toMatch(/not connected/i)
  })

  it('posts to the webhook and reports success when it answers 200', async () => {
    vi.stubEnv('CONTACT_WEBHOOK_URL', 'https://hooks.example.com/contact')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    const r = await sendMessage(emptyContact, form())
    expect(r.status).toBe('success')
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
