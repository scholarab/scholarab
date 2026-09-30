// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { signPublication, verifyPublication } from '../lib/publication-signature'

const key = 'test-signing-key-0123456789abcdef'
const changes = [{ kind: 'program', publicId: 20, revision: 3, base: null, value: { id: 20, name: 'Draft', url: 'https://example.org' } }]

describe('publication signatures', () => {
  it('verifies what it signed, whatever order the keys come back in', async () => {
    const sig = await signPublication(key, 'req-1', changes)
    const reordered = [{ value: { url: 'https://example.org', name: 'Draft', id: 20 }, revision: 3, publicId: 20, kind: 'program', base: null }]
    expect(await verifyPublication(key, 'req-1', reordered, sig)).toBe(true)
  })

  it('rejects a changed url, another request id, another key, or no signature', async () => {
    const sig = await signPublication(key, 'req-1', changes)
    const phished = [{ ...changes[0]!, value: { ...changes[0]!.value, url: 'https://evil.example' } }]
    expect(await verifyPublication(key, 'req-1', phished, sig)).toBe(false)
    expect(await verifyPublication(key, 'req-2', changes, sig)).toBe(false)
    expect(await verifyPublication('another-key-entirely-0123456789', 'req-1', changes, sig)).toBe(false)
    expect(await verifyPublication(key, 'req-1', changes, null)).toBe(false)
    expect(await verifyPublication(key, 'req-1', changes, 'not-hex')).toBe(false)
  })
})
