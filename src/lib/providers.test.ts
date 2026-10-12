import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PROVIDERS, providerLogo, providerOf } from './providers';
import scholarships from '../data/scholarships.json';

describe('providers', () => {
  it('has a logo file exactly for the providers that claim one', () => {
    for (const p of PROVIDERS) expect(existsSync(`public/logos/${p.slug}.webp`), p.slug).toBe(p.logo !== false);
  });

  it('reads the organisation from shared hosts by path', () => {
    expect(providerOf('https://media-002-ca.cdn.govstack.com/keyano-015-ca/media/x.pdf')?.slug).toBe('keyano');
    expect(providerOf('https://sites.google.com/lpsd.ca/baronsbeyond/home')?.slug).toBe('lloydminster-public');
    expect(providerOf('https://sites.google.com/someone-else/page')).toBeNull();
  });

  it('matches a host and its subdomains, never a lookalike', () => {
    expect(providerOf('https://studentaid.alberta.ca/x')?.slug).toBe('alberta');
    expect(providerOf('https://www.ualberta.ca/x')?.slug).toBe('ualberta');
    expect(providerOf('https://lpsd.ca/x')?.slug).toBe('lloydminster-public');
    expect(providerOf('https://mchs.psd.ca/x')?.slug).toBe('parkland');
    expect(providerOf('not a url')).toBeNull();
  });

  it('gives most listings a logo (65% when the top 50 were drawn, 2026-10-12)', () => {
    const items = scholarships as Array<{ url: string | null }>;
    const hit = items.filter(s => providerLogo(s.url)).length;
    expect(hit / items.length).toBeGreaterThan(0.55);
  });
});
