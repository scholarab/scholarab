/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user: import('./lib/auth').Session['user'] | null
    session: import('./lib/auth').Session['session'] | null
  }
}
