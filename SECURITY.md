# Security Policy

## Supported Versions

ScholarAB is a public directory site. The latest version deployed to
[scholarab.ca](https://www.scholarab.ca) is always the supported version. There
are no maintained release branches.

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public GitHub issue for security vulnerabilities.
2. Email **contact.scholarab@gmail.com** with the subject line `[SECURITY] <brief description>`.
3. Include a description of the vulnerability, steps to reproduce, and potential impact.

You will receive a response within **72 hours** acknowledging the report. We aim
to release a fix within **7 days** for critical issues and **30 days** for
non-critical ones.

## Scope

In scope:

- **scholarab.ca** and its subdomains
- The source code in this repository, including the admin API routes and the
  build and sync scripts

Out of scope:

- Third-party infrastructure (Cloudflare Pages, Cloudflare Web Analytics, Neon)
- Scholarship and program links pointing to external institutions. A dead or
  hijacked third-party link is a data issue, not a vulnerability in ScholarAB;
  report those to contact.scholarab@gmail.com as a normal correction.
- Social engineering, physical attacks, and denial of service
- Missing headers or best practices with no demonstrated impact

## Architecture and attack surface

Most of ScholarAB is statically generated at build time from JSON in
`src/data/`, and the public pages have no server-side processing and no user
accounts. Public visitors are never asked to register, and no visitor personal
data is collected or stored.

It is **not** a purely static site, and the following surfaces do exist:

- **Public API routes** (`src/pages/api/`) for deadline alert signup,
  unsubscribe, and first-party analytics events. These are rate limited.
- **An authenticated admin area** (`/admin`) for editing listings, protected by
  an HMAC-signed session cookie and enforced in `src/middleware.ts`. It is
  single-operator and not open to registration.
- **A database** (Neon Postgres via Drizzle) backing alert subscriptions and
  analytics events. Public listing pages do not read from it at request time.
- **Scheduled GitHub Actions** that sync data, check links, send alerts, and
  prune events.

Reports touching the admin routes, the alert flow, or the analytics endpoint are
welcome and in scope.

## Data handling

- No visitor accounts, no tracking of individuals, and no third-party ad or
  analytics scripts beyond Cloudflare Web Analytics.
- Saved and bookmarked listings are stored only in the browser's
  `localStorage` and are never transmitted to any server.
- Email addresses submitted for deadline alerts are stored solely to send those
  alerts, and every alert includes a one-click unsubscribe.

## Security Headers

Configured for all responses in [`public/_headers`](./public/_headers):

| Header | Value |
|--------|-------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `no-referrer` |
| `Permissions-Policy` | camera, microphone, geolocation, payment disabled |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cross-Origin-Resource-Policy` | `same-site` |
| `Content-Security-Policy` | see [`public/_headers`](./public/_headers) |

Note: the CSP currently allows `'unsafe-inline'` for scripts and styles, which
is a known and accepted limitation of the current Astro inline-script setup.
Reports of this on its own, without a demonstrated injection path, are already
known.

## Project integrity

Reports about the integrity of the project itself are in scope and taken
seriously: anything that would let a third party alter listing data, redirect
students to a non-official application URL, or publish under the ScholarAB name
without authorization.

## Disclosure Policy

We follow **responsible disclosure**. Once a fix is deployed, we will publicly
acknowledge the reporter, with permission.
