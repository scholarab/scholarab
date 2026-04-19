import react from '@astrojs/react';
import { defineConfig, envField } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
// https://astro.build/config
export default defineConfig({
  output: 'static',
  adapter: cloudflare({ imageService: 'compile' }),
  integrations: [react()],
  env: {
    schema: {
      SESSION_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      DATABASE_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      DEPLOY_HOOK_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      ANTHROPIC_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  vite: {
    plugins: [
      {
        // sharp is only needed during prerender (build-time image optimization).
        // Replace it with an empty stub in the SSR/Worker bundle so Wrangler
        // doesn't try to resolve it as a native Node.js addon at runtime.
        name: 'empty-sharp-in-worker',
        enforce: 'pre',
        resolveId(id, _importer, options) {
          if (id === 'sharp' && options?.ssr) return '\0empty-sharp';
        },
        load(id) {
          if (id === '\0empty-sharp') return 'export default {};';
        },
      },
    ],
    resolve: {
      alias: {
        'react-dom/server': 'react-dom/server.edge',
      },
    },
  },
});
