import react from '@astrojs/react';
import { defineConfig, envField } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
// https://astro.build/config
export default defineConfig({
  site: 'https://www.scholarab.ca',
  output: 'static',
  // Astro's own origin check refuses any unsafe request with no Origin header,
  // and this site's Referrer-Policy: no-referrer stops Firefox from sending
  // one on a form POST, which broke /api/confirm for every Firefox user. The
  // equivalent check lives in src/lib/same-site.ts and leads with
  // Sec-Fetch-Site instead. Do not switch this back on without reading it.
  security: { checkOrigin: false },
  // Nothing reads Astro.session; without this the adapter binds a KV namespace
  // called SESSION that would sit unused.
  session: false,
  // Astro 7 defaults to JSX whitespace rules, which drop the space between
  // inline elements on separate lines. Keep the HTML-aware behaviour.
  compressHTML: true,
  adapter: cloudflare({
    imageService: 'compile',
    // workerd runs in UTC and ignores the build's TZ=America/Edmonton, so it
    // prerendered date-dependent counts and statuses a day off in the evening.
    // Node honours the pinned timezone.
    prerenderEnvironment: 'node',
  }),
  integrations: [react()],
  env: {
    schema: {
      SESSION_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      DATABASE_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
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
    // Shared scripts/styles should be cached once, not copied into 1,279 pages.
    build: {
      assetsInlineLimit: 0,
      // Vite 7's browser floor. Vite 8 raised it to Safari 16.4 and started
      // emitting media range syntax that Safari 16.0 to 16.3 cannot read.
      target: ['chrome107', 'edge107', 'firefox104', 'safari16'],
    },
  },
});
