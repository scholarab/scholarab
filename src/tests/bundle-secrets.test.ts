import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { findLeaks, secretValues } from '../../scripts/check-bundle-secrets'

let dist = ''
function build(files: Record<string, string>) {
  dist = mkdtempSync(join(tmpdir(), 'sab-dist-'))
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(dist, path, '..'), { recursive: true })
    writeFileSync(join(dist, path), text)
  }
  return dist
}
afterEach(() => { if (dist) rmSync(dist, { recursive: true, force: true }) })

const url = 'postgresql://owner:npg_Abc123Def456@ep-x-pooler.us-east-1.aws.neon.tech/neondb'

describe('secretValues', () => {
  it('reads secret-named values, quoted or not, and skips the rest', () => {
    const found = secretValues(`DATABASE_URL=${url}\nANTHROPIC_API_KEY="sk-ant-api03-abcdefghijklmnopqrstuv"\nSITE_URL=https://www.scholarab.ca\nSESSION_SECRET=short\n`)
    expect([...found.keys()]).toEqual(['DATABASE_URL', 'ANTHROPIC_API_KEY'])
    expect(found.get('ANTHROPIC_API_KEY')).toBe('sk-ant-api03-abcdefghijklmnopqrstuv')
  })
})

describe('findLeaks', () => {
  it('names the file and variable of an inlined secret, never the value', () => {
    const dir = build({ 'server/chunks/client.mjs': `const url = getEnv("DATABASE_URL") ?? "${url}"` })
    const leaks = findLeaks(dir, secretValues(`DATABASE_URL=${url}`))
    expect(leaks).toEqual(['server/chunks/client.mjs: DATABASE_URL', 'server/chunks/client.mjs: a Postgres URL with a password'])
    expect(leaks.join()).not.toContain('npg_')
  })

  it('catches credential shapes with no env file, as on a hosted build', () => {
    const dir = build({ 'client/a.js': 'k="sk-ant-api03-abcdefghijklmnopqrstuvwxyz"' })
    expect(findLeaks(dir, new Map())).toEqual(['client/a.js: an Anthropic API key'])
  })

  it("ignores the driver's placeholder URL, its URL builder and the preview .dev.vars", () => {
    const dir = build({
      'server/chunks/neon.mjs': 'e("should be: postgresql://user:password@host.tld/db");l=`postgresql://${u(o.user)}:${u(o.password)}@${h}`',
      'server/.dev.vars': `DATABASE_URL='${url}'`,
    })
    expect(findLeaks(dir, secretValues(`DATABASE_URL=${url}`))).toEqual([])
  })
})
