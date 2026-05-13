// Restructure v13 @astrojs/cloudflare output for CF Pages advanced mode.
//
// v13 generates:
//   dist/client/  — static assets (served by ASSETS binding)
//   dist/server/  — Worker (entry.mjs + chunks/)
//
// CF Pages advanced mode needs _worker.mjs inside the deploy directory.
// We copy the Worker entry + its dependencies into dist/client/ so that
// `wrangler pages deploy dist/client` finds and uses _worker.mjs.

import { copyFile, cp } from 'fs/promises'

await copyFile('dist/server/entry.mjs', 'dist/client/_worker.mjs')
await copyFile('dist/server/virtual_astro_middleware.mjs', 'dist/client/virtual_astro_middleware.mjs')
await cp('dist/server/chunks', 'dist/client/chunks', { recursive: true, force: true })
