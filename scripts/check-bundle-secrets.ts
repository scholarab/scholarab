#!/usr/bin/env node
/**
 * Fails the build if a credential ended up inside dist/.
 *
 * Until 2026-09-29, `npm run build` compiled the live DATABASE_URL and
 * ANTHROPIC_API_KEY into dist/server from .env.local: Vite inlines any
 * import.meta.env.X it can resolve, and blanking DATABASE_URL on the command
 * line did not stop it. The lint rule stops that one door; this checks the
 * output, whichever door a future secret comes through.
 *
 * Two checks. Values: every secret-named variable in the local env files,
 * which catches a local build. Shapes: a Postgres URL carrying a password and
 * an Anthropic key, which catch a hosted build whose secrets came from build
 * variables rather than files. Only file paths and variable names are ever
 * printed, never a value.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'

// The Cloudflare plugin copies the env files here on purpose, for local
// `wrangler dev`. wrangler deploy never uploads it and git ignores it.
const ALLOWED = new Set(['server/.dev.vars'])
const TEXT = /\.(m?js|cjs|html|json|css|txt|map|xml|svg|webmanifest)$/
const SECRET_NAME = /SECRET|KEY|PASSWORD|TOKEN|SALT|DATABASE_URL/
const SHAPES: [string, RegExp][] = [
  // Not the driver's own "user:password@" example or its `${...}` builder.
  ['a Postgres URL with a password', /postgres(?:ql)?:\/\/[^:/\s'"`$]+:(?!password@)(?!\$\{)[^@\s'"`]+@/],
  ['an Anthropic API key', /sk-ant-[\w-]{20,}/],
]

export function secretValues(envText: string): Map<string, string> {
  const found = new Map<string, string>()
  for (const line of envText.split('\n')) {
    const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (!m || !SECRET_NAME.test(m[1]!)) continue
    const value = m[2]!.trim().replace(/^(['"`])(.*)\1$/, '$2')
    // Short values would match by accident and are not worth stealing.
    if (value.length >= 12) found.set(m[1]!, value)
  }
  return found
}

export function findLeaks(dir: string, secrets: Map<string, string>): string[] {
  const leaks: string[] = []
  const walk = (d: string) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const path = join(d, entry.name)
      if (entry.isDirectory()) { walk(path); continue }
      const rel = relative(dir, path)
      if (ALLOWED.has(rel) || !TEXT.test(entry.name)) continue
      const text = readFileSync(path, 'utf8')
      for (const [name, value] of secrets) if (text.includes(value)) leaks.push(`${rel}: ${name}`)
      for (const [label, shape] of SHAPES) if (shape.test(text)) leaks.push(`${rel}: ${label}`)
    }
  }
  walk(dir)
  return leaks
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const secrets = new Map<string, string>()
  for (const file of ['.env', '.env.local', '.env.production', '.dev.vars'])
    if (existsSync(file)) for (const [k, v] of secretValues(readFileSync(file, 'utf8'))) secrets.set(k, v)
  const leaks = findLeaks('dist', secrets)
  if (leaks.length) {
    console.error('Credentials found in the build output. Read them with getEnv, not import.meta.env:')
    for (const leak of leaks) console.error(`  ${leak}`)
    process.exit(1)
  }
  console.log(`check-bundle-secrets: dist is clean (${secrets.size} local secret values checked)`)
}
