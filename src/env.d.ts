/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly DATABASE_URL: string
  readonly SESSION_SECRET: string
  readonly ADMIN_PASSWORD: string
  readonly ANTHROPIC_API_KEY: string
  readonly DEPLOY_HOOK_URL: string
  readonly RESEND_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare namespace App {
  interface Locals {
    user: { id: string; email: string; name?: string | null } | null
  }
}
