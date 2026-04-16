/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly DATABASE_URL: string
  readonly BETTER_AUTH_SECRET: string
  readonly BETTER_AUTH_URL: string
  readonly ADMIN_PASSWORD: string
  readonly ANTHROPIC_API_KEY: string
  readonly DEPLOY_HOOK_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare namespace App {
  interface Locals {
    user: { id: string; email: string; name?: string | null } | null
    session: null
  }
}
