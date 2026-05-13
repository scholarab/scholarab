// Bundle the v13 @astrojs/cloudflare Worker into a single _worker.mjs for
// CF Pages advanced mode, which requires a self-contained entry file.
//
// v13 generates:
//   dist/client/  — static assets (served by ASSETS binding)
//   dist/server/  — Worker split into entry.mjs + chunks/
//
// CF Pages advanced mode needs a single-file _worker.mjs in the deploy dir.
// esbuild bundles entry.mjs (and all its chunk imports) into one file.

import { build } from 'esbuild'

await build({
  entryPoints: ['dist/server/entry.mjs'],
  bundle: true,
  outfile: 'dist/client/_worker.mjs',
  format: 'esm',
  platform: 'browser',  // Cloudflare Workers run in a browser-like environment
  target: 'es2022',
  // These are CF Workers / Node-compat built-ins — leave them as-is
  external: [
    'cloudflare:workers',
    'cloudflare:sockets',
    'node:*',
    '__STATIC_CONTENT_MANIFEST',
  ],
  // Keep dynamic imports lazy (avoids bundling everything eagerly)
  splitting: false,
  minify: false,
  logLevel: 'info',
})
