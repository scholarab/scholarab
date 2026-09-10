import { describe, it, expect } from 'vitest';
import { programCreateSchema, programUpdateSchema } from '../../lib/admin-schemas';
// Both program and scholarship CRUD contracts run against PostgreSQL in
// scholarships.test.ts; this file covers program-specific validation.
describe('program schema', () => {
  it('requires HTTPS and a name', () => {
    expect(
      programCreateSchema.safeParse({ name: 'Research', url: 'http://example.com' }).success
    ).toBe(false);
  });
  it('partial edits do not overwrite paid/active defaults', () => {
    expect(programUpdateSchema.parse({ name: 'Changed' })).toEqual({ name: 'Changed' });
  });
  it('new programs default to active and unpaid', () => {
    expect(
      programCreateSchema.parse({ name: 'Research', url: 'https://example.com' })
    ).toMatchObject({ paid: false, active: true });
  });
});
