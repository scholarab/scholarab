import react from '@astrojs/react';
import { defineConfig, envField } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
// https://astro.build/config
export default defineConfig({
  site: 'https://www.scholarab.ca',
  output: 'static',
  adapter: cloudflare({ imageService: 'compile' }),
  integrations: [react()],
  env: {
    schema: {
      SESSION_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      DATABASE_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      DEPLOY_HOOK_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      ANTHROPIC_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Confirmation emails for double opt-in (/api/alert). Optional: without
      // it the Worker cannot mail the confirm link and the daily job sweeps
      // the sign-up instead; see scripts/send-alerts.ts. Declared here
      // because getEnv() only resolves names in this schema.
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      ALERT_FROM_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true }),
      ALERT_REPLY_TO: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Postal address for the CASL sender-identification block in every
      // outgoing email. Not a secret, but read the same way as the rest.
      ALERT_MAILING_ADDRESS: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Optional override for the limiter's key salt. Unset is the normal
      // case: rate-limit.ts derives one from SESSION_SECRET, with domain
      // separation, so there is nothing extra to bind.
      RATE_LIMIT_SALT: envField.string({ context: 'server', access: 'secret', optional: true }),
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
      // Only alias in builds: the edge build is CJS and crashes Vite's dev
      // module runner with "require is not defined".
      alias: import.meta.env.PROD && {
        'react-dom/server': 'react-dom/server.edge',
      },
    },
  },
});
