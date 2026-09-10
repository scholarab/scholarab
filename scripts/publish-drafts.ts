#!/usr/bin/env node
/** Runs only inside the serialized publisher workflow. No shell-interpolated
 * content, no outbound email, and nothing reaches git before validation passes. */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { neon } from '@neondatabase/serverless';
import { applyPublication, type PublicationChange, type Document } from '../src/lib/catalogue.ts';
import { buildMatchingCatalogue } from '../src/lib/matching/catalogue.ts';
import { stableJson } from '../src/lib/catalogue.ts';
import { generateSlug } from '../src/lib/utils.ts';
const sql = neon(process.env.DATABASE_URL!);
const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8')) as Document[];
const [pending] =
  await sql`SELECT * FROM publication_requests WHERE status IN ('queued','processing','committed') ORDER BY created_at LIMIT 1`;
if (!pending) {
  console.log('No publication pending');
  process.exit(0);
}
const id = String(pending.id);
const paths = {
  scholarship: 'src/data/scholarships.json',
  program: 'src/data/research-programs.json',
};
const marker = 'public/publication.json';
const manifest = () => {
  try {
    return JSON.parse(readFileSync(marker, 'utf8')) as { id: string };
  } catch {
    return null;
  }
};
async function acknowledge(commit: string) {
  // A committed revision is authoritative even if the earlier runner died
  // between push and acknowledgement. Preserve edits made after queuing.
  const queries = [];
  for (const kind of ['scholarship', 'program'] as const) {
    const current = new Map(read(paths[kind]).map((d) => [d.id, d]));
    for (const change of pending!.changes as PublicationChange[]) {
      if (change.kind !== kind) continue;
      queries.push(sql`UPDATE catalogue_entries SET published=${JSON.stringify(current.get(change.publicId) ?? null)}::jsonb,
        draft=CASE WHEN revision=${change.revision} THEN NULL ELSE draft END,
        draft_base=CASE WHEN revision=${change.revision} THEN NULL ELSE draft_base END,
        deleted=CASE WHEN revision=${change.revision} THEN false ELSE deleted END,
        revision=revision+1,updated_at=now()
        WHERE kind=${kind} AND public_id=${change.publicId}`);
    }
  }
  queries.push(
    sql`UPDATE publication_requests SET status='committed',commit_sha=${commit},message='Validated and committed; waiting for deployment.',updated_at=now() WHERE id=${id}`
  );
  await sql.transaction(queries);
}
if (pending.status !== 'committed') {
  // Git already contains this exact request: recover a crash after push.
  if (manifest()?.id === id) await acknowledge(git('rev-parse', 'HEAD'));
  else {
    await sql`UPDATE publication_requests SET status='processing',updated_at=now() WHERE id=${id}`;
    let pushed = false;
    try {
      const changes = pending.changes as PublicationChange[];
      let redirects = readFileSync('public/_redirects', 'utf8');
      for (const kind of ['scholarship', 'program'] as const) {
        const before = read(paths[kind]);
        const after = applyPublication(before, changes, kind);
        const existing = new Map(before.map((d) => [d.id, d]));
        for (const c of changes.filter((c) => c.kind === kind)) {
          const old = existing.get(c.publicId);
          if (!old) continue;
          const field = kind === 'scholarship' ? 'title' : 'name';
          const prefix = kind === 'scholarship' ? 'scholarships' : 'programs';
          const from = `/${prefix}/${generateSlug(String(old[field]))}`;
          const next = after.find((d) => d.id === c.publicId);
          const to = next ? `/${prefix}/${generateSlug(String(next[field]))}` : `/${prefix}/`;
          if (from !== to && !redirects.split('\n').some((line) => line.split(/\s+/)[0] === from))
            redirects += `\n${from} ${to} 301\n`;
        }
        writeFileSync(paths[kind], JSON.stringify(after, null, 2) + '\n');
      }
      writeFileSync('public/_redirects', redirects);
      writeFileSync(marker, JSON.stringify({ id }) + '\n');
      execFileSync('npm', ['run', 'build'], { stdio: 'inherit' }); // includes full catalogue validation
      git('add', ...Object.values(paths), 'src/data/lastmod.json', 'public/_redirects', marker);
      git('commit', '-m', `Publish reviewed admin drafts ${id}`);
      const commit = git('rev-parse', 'HEAD');
      // A concurrent main update rejects push, never force-push or overwrite it.
      git('push', 'origin', 'HEAD:main');
      pushed = true;
      await acknowledge(commit);
    } catch (e) {
      if (!pushed) {
        // Push could have succeeded despite a network error. Read the remote
        // marker before deciding this request failed; leave processing if the
        // remote itself is unavailable, so the next runner can reconcile.
        git('fetch', 'origin', 'main');
        let remote = '';
        try {
          remote = git('show', `origin/main:${marker}`);
        } catch {
          /* marker not published */
        }
        if (remote && JSON.parse(remote).id === id) {
          console.log('Push confirmed remotely; next run will acknowledge');
          process.exit(0);
        }
        await sql`UPDATE publication_requests SET status='failed',message=${(e instanceof Error ? e.message : 'Publication failed').slice(0, 1000)},updated_at=now() WHERE id=${id}`;
      }
      throw e;
    }
  }
}
// Completion is tied to the public artifact ID, not a deploy-hook response or
// a sitemap date that an unrelated deployment may also carry.
try {
  const response = await fetch(`https://www.scholarab.ca/publication.json?request=${id}`, {
    signal: AbortSignal.timeout(15000),
    headers: { 'User-Agent': 'Mozilla/5.0 ScholarAB publication verification' },
  });
  const expectedMatching = await buildMatchingCatalogue({
    scholarship: read(paths.scholarship),
    program: read(paths.program),
  });
  const matchingResponse = await fetch(
    `https://www.scholarab.ca/matching/manifest.json?request=${id}`,
    {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'Mozilla/5.0 ScholarAB publication verification' },
    }
  );
  const matchingLive =
    matchingResponse.ok &&
    stableJson(await matchingResponse.json()) === stableJson(expectedMatching.manifest);
  if (response.ok && ((await response.json()) as { id?: string }).id === id && matchingLive) {
    await sql`UPDATE publication_requests SET status='published',message='Publication is live.',updated_at=now() WHERE id=${id}`;
    console.log('Publication verified live');
  } else console.log('Committed; deployment not visible yet. Next run will verify.');
} catch {
  console.log('Committed; could not verify deployment yet. Next run will retry.');
}
