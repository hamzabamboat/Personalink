import { describe, it, expect, vi, afterEach } from 'vitest'
import { shareToLinkedIn } from '../share-to-linkedin'

afterEach(() => {
  vi.unstubAllGlobals()
})

// Stub the browser globals the helper reaches for. The vitest env is 'node',
// so navigator/window are otherwise undefined.
function stubEnv(opts: { share?: unknown; clipboard?: unknown; open?: () => void }) {
  const nav: Record<string, unknown> = {}
  if (opts.share !== undefined) nav.share = opts.share
  if (opts.clipboard !== undefined) nav.clipboard = opts.clipboard
  vi.stubGlobal('navigator', nav)
  vi.stubGlobal('window', { open: opts.open ?? vi.fn() })
}

const COMPOSER = 'https://www.linkedin.com/feed/?shareActive=true'

describe('shareToLinkedIn', () => {
  it('uses the native share sheet when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    stubEnv({ share })
    const res = await shareToLinkedIn('hello @jane')
    expect(share).toHaveBeenCalledWith({ text: 'hello @jane' })
    expect(res).toBe('shared')
  })

  it('returns "cancelled" when the user dismisses the share sheet, with no fallback', async () => {
    const abort = Object.assign(new Error('dismissed'), { name: 'AbortError' })
    const share = vi.fn().mockRejectedValue(abort)
    const writeText = vi.fn()
    const open = vi.fn()
    stubEnv({ share, clipboard: { writeText }, open })
    const res = await shareToLinkedIn('hi')
    expect(res).toBe('cancelled')
    expect(writeText).not.toHaveBeenCalled()
    expect(open).not.toHaveBeenCalled()
  })

  it('falls back to clipboard + open when share fails with a non-abort error', async () => {
    const share = vi.fn().mockRejectedValue(new Error('NotAllowedError'))
    const writeText = vi.fn().mockResolvedValue(undefined)
    const open = vi.fn()
    stubEnv({ share, clipboard: { writeText }, open })
    const res = await shareToLinkedIn('post body')
    expect(writeText).toHaveBeenCalledWith('post body')
    expect(open).toHaveBeenCalledWith(COMPOSER, '_blank', 'noopener')
    expect(res).toBe('copied')
  })

  it('copies + opens LinkedIn when the native share API is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const open = vi.fn()
    stubEnv({ clipboard: { writeText }, open }) // no share
    const res = await shareToLinkedIn('body')
    expect(writeText).toHaveBeenCalledWith('body')
    expect(open).toHaveBeenCalledWith(COMPOSER, '_blank', 'noopener')
    expect(res).toBe('copied')
  })

  it('returns "failed" when the clipboard write throws', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    stubEnv({ clipboard: { writeText } })
    const res = await shareToLinkedIn('body')
    expect(res).toBe('failed')
  })
})
