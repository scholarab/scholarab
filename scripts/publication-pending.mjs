import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Same HTTP protocol as @neondatabase/serverless, without installing the site
// just to read one boolean. No draft data or credentials leave this process.
export async function publicationPending(connectionString) {
  const connection = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(connection.protocol) ||
      !connection.hostname.endsWith('.neon.tech')) throw new Error('Unsupported database configuration');
  const endpoint = `https://${connection.hostname.replace(/^[^.]+\./, 'api.')}/sql`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15_000),
        headers: { 'Content-Type': 'application/json', 'Neon-Connection-String': connectionString,
          'Neon-Raw-Text-Output': 'true', 'Neon-Array-Mode': 'true' },
        body: JSON.stringify({ query: "SELECT EXISTS (SELECT 1 FROM publication_requests WHERE status IN ('queued', 'processing', 'committed'))", params: [] }),
      });
      if (!response.ok) throw new Error('Queue query failed');
      const result = await response.json();
      const value = result.rows?.[0]?.[0];
      if (value === 't' || value === true) return true;
      if (value === 'f' || value === false) return false;
      throw new Error('Invalid queue response');
    } catch {
      if (attempt === 3) throw new Error('Queue check failed after three attempts; publication was not skipped as empty.');
      await new Promise(resolve => setTimeout(resolve, attempt * 1_000));
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const pending = await publicationPending(process.env.DATABASE_URL);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `pending=${pending}\n`);
    console.log(pending ? 'Publication work pending.' : 'No publication pending; skipping installation and build.');
  } catch {
    // Never print a fetch error: its context can include the credential header.
    console.error('Cannot check publication queue; retry on the next scheduled run.');
    process.exitCode = 1;
  }
}
