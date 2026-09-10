import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Row = Record<string, unknown>;
const fixture = vi.hoisted(() => ({
  scholarships: [] as Row[],
  programs: [] as Row[],
  written: new Map<string, Row[]>(),
}));

// Exercise the actual automation with isolated input/output. No repository data
// can be changed by these tests, even when the script decides to write a file.
vi.mock('fs', () => {
  const fs = {
    readFileSync(path: string) {
      if (path.endsWith('/scholarships.json')) return JSON.stringify(fixture.scholarships);
      if (path.endsWith('/research-programs.json')) return JSON.stringify(fixture.programs);
      throw new Error(`Unexpected expiration input: ${path}`);
    },
    writeFileSync(path: string, contents: string) {
      fixture.written.set(path.split('/').at(-1)!, JSON.parse(contents));
    },
  };
  return { ...fs, default: fs };
});

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  // UTC is already September 11, but Alberta's deadline day is still the 10th.
  vi.setSystemTime(new Date('2026-09-11T00:30:00Z'));
  vi.spyOn(console, 'log').mockImplementation(() => {});
  fixture.scholarships = [];
  fixture.programs = [];
  fixture.written.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function expire(scholarships: Row[] = [], programs: Row[] = []) {
  fixture.scholarships = scholarships;
  fixture.programs = programs;
  await import('../../scripts/auto-expire');
  return {
    scholarships: fixture.written.get('scholarships.json') ?? scholarships,
    programs: fixture.written.get('research-programs.json') ?? programs,
  };
}

describe('expiration publication data', () => {
  it('does not revive retired awards with a stale opening date and no dated deadline', async () => {
    const retired = [undefined, null, '', 'TBA', '15 May 2026'].map((deadline, index) => ({
      id: index + 1,
      title: 'Retired award',
      active: false,
      openDate: '2025-09-01',
      deadline,
    }));
    const result = await expire(retired);
    expect(result.scholarships).toEqual(retired);
    expect(fixture.written.size).toBe(0);
  });

  it('reopens only announced cycles whose opening arrived and dated deadline has not passed', async () => {
    const result = await expire([
      { id: 1, title: 'Open through today', active: false, openDate: '2026-09-01', deadline: '2026-09-10' },
      { id: 2, title: 'Open future deadline', active: false, openDate: '2026-09-10', deadline: '2026-09-30' },
      { id: 3, title: 'Past cycle', active: false, openDate: '2026-09-01', deadline: '2026-09-09' },
      { id: 4, title: 'Opens tomorrow', active: false, openDate: '2026-09-11', deadline: '2026-09-30' },
      { id: 5, title: 'Opening unknown', active: false, deadline: '2026-09-30' },
    ]);
    expect(result.scholarships.map(({ id, active }) => ({ id, active }))).toEqual([
      { id: 1, active: true },
      { id: 2, active: true },
      { id: 3, active: false },
      { id: 4, active: false },
      { id: 5, active: false },
    ]);
  });

  it('keeps awards open through Alberta deadline day and expires only passed ISO dates', async () => {
    const result = await expire([
      { id: 1, title: 'Closes today', active: true, deadline: '2026-09-10' },
      { id: 2, title: 'Closed yesterday', active: true, deadline: '2026-09-09' },
      { id: 3, title: 'Unpublished date', active: true },
      { id: 4, title: 'Invalid legacy date', active: true, deadline: '01-05-2026' },
    ]);
    expect(result.scholarships.map((row) => row.active)).toEqual([true, false, true, true]);
  });

  it('preserves retired programs and resets only passed active cycles to TBA', async () => {
    const programs = [
      { id: 1, name: 'Retired dated', active: false, deadline: '2025-09-01' },
      { id: 2, name: 'Retired ongoing', active: false, deadline: 'Ongoing' },
      { id: 3, name: 'Cycle ended', deadline: '2026-09-09' },
      { id: 4, name: 'Deadline today', deadline: '2026-09-10' },
      { id: 5, name: 'Unpublished cycle', deadline: 'TBA' },
      { id: 6, name: 'Ongoing', deadline: 'Ongoing' },
    ];
    const result = await expire([], programs);
    expect(result.programs).toEqual(programs.map((row) => row.id === 3 ? { ...row, deadline: 'TBA' } : row));
  });
});
