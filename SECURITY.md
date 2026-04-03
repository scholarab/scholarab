# Security Policy

## Supported Versions

ScholarAB is a static public directory site. The latest deployed version on [scholarab.ca](https://scholarab.ca) is always the supported version.

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public GitHub issue for security vulnerabilities.
2. Email **contact.scholarab@gmail.com** with the subject line `[SECURITY] <brief description>`.
3. Include a description of the vulnerability, steps to reproduce, and potential impact.

You will receive a response within **72 hours** acknowledging the report. We aim to release a fix within **7 days** for critical issues and **30 days** for non-critical ones.

## Scope

The following are in scope:

- **scholarab.ca** and any subdomains
- The source code in this repository

The following are out of scope:

- Third-party services (Vercel infrastructure, Vercel Analytics)
- Scholarship/program links pointing to external institutions
- Social engineering attacks

## Security Architecture

ScholarAB is a **static site** with no backend, no user accounts, and no server-side processing. This eliminates entire classes of vulnerabilities by design:

- No SQL injection (no database)
- No authentication bypass (no accounts)
- No server-side code execution
- No file upload attack surface

User bookmark data is stored exclusively in the browser's `localStorage` and is never transmitted to any server.

## Security Headers

The following HTTP security headers are configured on all responses:

| Header | Value |
|--------|-------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `no-referrer` |
| `Permissions-Policy` | camera, microphone, geolocation, and payment disabled |
| `Content-Security-Policy` | See `vercel.json` |

## Disclosure Policy

We follow **responsible disclosure**. Once a fix is deployed, we will publicly acknowledge the reporter (with permission) in the release notes.
