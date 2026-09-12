// @vitest-environment node
import { it, expect } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import catalogue from '../data/runtime-catalogue.json';
import { loadScholarshipsFromJson, loadProgramsFromJson } from '../lib/data-loader';

it('preserves every public reminder identity, label, availability and deadline', async () => {
  const scholarships = await loadScholarshipsFromJson();
  const programs = await loadProgramsFromJson();
  // Compare the serialized contract, including omitted versus null fields.
  const json = (value: unknown) => JSON.parse(JSON.stringify(value));
  expect(catalogue.scholarships).toEqual(json(scholarships.map(
    ({ id, title, active, deadline }) => ({ id, title, active, deadline }),
  )));
  expect(catalogue.programs).toEqual(json(programs.map(
    ({ id, name, active, deadline }) => ({ id, name, active, deadline }),
  )));
});

it('generates both payloads together, preserves publication identity, and rejects truncated inputs before writing', () => {
  const root = mkdtempSync(join(tmpdir(), 'scholarab-payloads-'));
  const runner = resolve('node_modules/.bin/tsx');
  const script = resolve('scripts/generate-catalogue-payloads.ts');
  try {
    mkdirSync(join(root, 'src/data'), { recursive: true });
    mkdirSync(join(root, 'public'));
    const write = (file: string, value: unknown) => writeFileSync(join(root, file), JSON.stringify(value));
    const read = (file: string) => JSON.parse(readFileSync(join(root, file), 'utf8'));
    write('src/data/scholarships.json', [{ id: 17, title: 'Award', url: 'https://example.org/award',
      active: false, eligibility: null, notes: 'Editorial-only notes', audience: 'An audience' }]);
    write('src/data/research-programs.json', [{ id: 29, name: 'Program', url: 'https://example.org/program', deadline: 'TBA' }]);
    write('public/publication.json', { id: 'reviewed-request' });
    execFileSync(runner, [script], { cwd: root });
    const runtime = read('src/data/runtime-catalogue.json');
    expect(runtime).toEqual({ scholarships: [{ id: 17, title: 'Award', active: false }],
      programs: [{ id: 29, name: 'Program', active: true, deadline: 'TBA' }] });
    expect(read('src/data/quiz-payload.json').scholarships[0]).toMatchObject({ id: 17, audience: 'An audience' });
    const marker = read('public/publication.json');
    expect(marker.id).toBe('reviewed-request');
    expect(marker.catalogueHash).toMatch(/^[a-f0-9]{64}$/);
    write('src/data/research-programs.json', []);
    expect(spawnSync(runner, [script], { cwd: root }).status).toBe(1);
    expect(read('src/data/runtime-catalogue.json')).toEqual(runtime);
    expect(read('public/publication.json')).toEqual(marker);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
