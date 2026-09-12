// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { publicationPending } from '../../scripts/publication-pending.mjs';
import { livePublicationMatches } from '../../scripts/live-publication';
import { groupLinkTargets, forEachHost } from '../../scripts/link-targets';
import { parseMessage } from '../lib/parse-message';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

it('requires a real permanent redirect for removed detail URLs and rejects an unreadable base', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'scholarab-slugs-'));
  const runner = resolve('node_modules/.bin/tsx');
  const script = resolve('.agents/skills/ship-check/scripts/slug-diff.ts');
  try {
    mkdirSync(join(fixture, 'src/data'), { recursive: true });
    mkdirSync(join(fixture, 'public'));
    writeFileSync(join(fixture, 'src/data/scholarships.json'), '[{"title":"Old Award"}]');
    writeFileSync(join(fixture, 'src/data/research-programs.json'), '[]');
    execFileSync('git', ['init', '-q'], { cwd: fixture });
    execFileSync('git', ['add', '.'], { cwd: fixture });
    execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.test', 'commit', '-qm', 'fixture'], { cwd: fixture });
    writeFileSync(join(fixture, 'src/data/scholarships.json'), '[]');
    for (const redirect of ['# /scholarships/old-award /scholarships/new 301', '/scholarships/old-award /scholarships/new 302']) {
      writeFileSync(join(fixture, 'public/_redirects'), redirect);
      expect(spawnSync(runner, [script, 'HEAD'], { cwd: fixture }).status).toBe(1);
    }
    writeFileSync(join(fixture, 'public/_redirects'), '/scholarships/old-award /scholarships/new 301');
    expect(spawnSync(runner, [script, 'HEAD'], { cwd: fixture }).status).toBe(0);
    expect(spawnSync(runner, [script, 'missing-revision'], { cwd: fixture }).status).toBe(1);
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});

describe('publication preflight', () => {
  const connection = 'postgresql://test:private@ep-example-pooler.us-east-2.aws.neon.tech/db?sslmode=require';
  it.each([['t', true], ['f', false]])('interprets an explicit %s queue result', async (value, expected) => {
    const request = vi.fn().mockResolvedValue(Response.json({ rows: [[value]] }));
    vi.stubGlobal('fetch', request);
    expect(await publicationPending(connection)).toBe(expected);
    expect(request.mock.calls[0]?.[0]).toBe('https://api.us-east-2.aws.neon.tech/sql');
    const options = request.mock.calls[0]?.[1];
    expect(options.redirect).toBe('error');
    expect(JSON.parse(options.body).query).toContain("('queued', 'processing', 'committed')");
    expect(options.headers['Neon-Connection-String']).toBe(connection);
  });
  it('does not treat malformed responses or outages as an empty queue; stops at three', async () => {
    vi.useFakeTimers();
    const request = vi.fn().mockImplementation(async () => Response.json({ rows: [] }));
    vi.stubGlobal('fetch', request);
    const result = expect(publicationPending(connection)).rejects.toThrow('three attempts');
    await vi.runAllTimersAsync();
    await result;
    expect(request).toHaveBeenCalledTimes(3);
  });
  it('never sends credentials to an unsupported host', async () => {
    const request = vi.fn(); vi.stubGlobal('fetch', request);
    await expect(publicationPending('postgresql://test:private@example.com/db')).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
});

describe('deployment readiness', () => {
  it('rejects a different catalogue even when the same-day sitemap matches', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ catalogueHash: 'old' }))
      .mockResolvedValueOnce(new Response('<lastmod>2026-09-10</lastmod>')));
    expect(await livePublicationMatches('new', '<lastmod>2026-09-10</lastmod>')).toBe(false);
  });
  it('requires both the catalogue and the sitemap to match', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ catalogueHash: 'new' }))
      .mockResolvedValueOnce(new Response('current sitemap')));
    expect(await livePublicationMatches('new', 'current sitemap')).toBe(true);
  });
  it('rejects a changed sitemap and a blocked edge', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ catalogueHash: 'new' }))
      .mockResolvedValueOnce(new Response('old sitemap')));
    expect(await livePublicationMatches('new', 'new sitemap')).toBe(false);
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response('', { status: 403 })));
    expect(await livePublicationMatches('new', 'new sitemap')).toBe(false);
  });
});

describe('deduplicated link checks', () => {
  it('starts the next host as soon as a slot is free, checks all hosts once and stays bounded', async () => {
    vi.useFakeTimers();
    const started: number[] = [];
    const completed: number[] = [];
    let active = 0, peak = 0;
    const run = forEachHost(Array.from({ length: 19 }, (_, i) => i), 8, async host => {
      started.push(host);
      peak = Math.max(peak, ++active);
      await new Promise(resolve => setTimeout(resolve, host === 0 ? 1000 : 10));
      --active;
      completed.push(host);
    });
    expect(started).toHaveLength(8);
    await vi.advanceTimersByTimeAsync(10);
    expect(started).toContain(8);
    expect(completed).not.toContain(0);
    await vi.runAllTimersAsync();
    await run;
    expect(peak).toBe(8);
    expect(started).toEqual(Array.from({ length: 19 }, (_, i) => i));
    expect(completed.sort((a, b) => a - b)).toEqual(started);
  });
  it('does not turn a failed host operation or invalid concurrency into a successful empty report', async () => {
    await expect(forEachHost(['host'], 1, async () => { throw new Error('checker failed'); })).rejects.toThrow('checker failed');
    const check = vi.fn();
    await expect(forEachHost(['host'], 0, check)).rejects.toThrow('positive integer');
    await forEachHost([], 8, check);
    expect(check).not.toHaveBeenCalled();
  });
  it('retains every listing while keeping different paths and queries separate', () => {
    const items = [
      { id: 1, label: 'A', url: 'https://example.com/award' },
      { id: 2, label: 'B', url: 'https://example.com/award' },
      { id: 3, label: 'C', url: 'https://example.com/award?year=2027' },
      { id: 4, label: 'D' },
    ];
    const targets = groupLinkTargets(items);
    expect(targets.size).toBe(2);
    expect(targets.get(items[0]!.url!)?.map(item => item.id)).toEqual([1, 2]);
  });
});

describe('minimal eligibility API transport', () => {
  it('preserves the API request and only returns text', async () => {
    const request = vi.fn().mockResolvedValue(Response.json({ content: [{ type: 'text', text: ' {} ' }] }));
    vi.stubGlobal('fetch', request);
    expect(await parseMessage('test-key', 'unchanged prompt')).toBe('{}');
    const [url, options] = request.mock.calls[0]!;
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(options.headers).toMatchObject({ 'x-api-key': 'test-key', 'anthropic-version': '2023-06-01' });
    expect(JSON.parse(options.body)).toEqual({ model: 'claude-haiku-4-5-20251001', max_tokens: 1024,
      messages: [{ role: 'user', content: 'unchanged prompt' }] });
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });
  it('recovers from a transient failure', async () => {
    vi.useFakeTimers();
    const request = vi.fn().mockRejectedValueOnce(new Error('connection reset'))
      .mockResolvedValueOnce(Response.json({ content: [{ type: 'text', text: '{}' }] }));
    vi.stubGlobal('fetch', request);
    const result = parseMessage('key', 'prompt');
    await vi.runAllTimersAsync();
    expect(await result).toBe('{}');
    expect(request).toHaveBeenCalledTimes(2);
  });
  it.each([401, 429, 503])('bounds HTTP %s failures and hides response details', async status => {
    vi.useFakeTimers();
    const request = vi.fn().mockImplementation(async () => new Response('private details', { status }));
    vi.stubGlobal('fetch', request);
    const result = expect(parseMessage('key', 'prompt')).rejects.toThrow('Eligibility service unavailable');
    await vi.runAllTimersAsync();
    await result;
    expect(request).toHaveBeenCalledTimes(status === 401 ? 1 : 3);
  });
});
