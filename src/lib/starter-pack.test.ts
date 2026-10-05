import { beforeEach, describe, expect, it } from 'vitest';
import raw from '../data/scholarships.json';
import { STARTER_PACK_IDS, STARTER_PACK_KEY } from './starter-pack';

type Listing = {
  id: number; title: string; region?: string | null; concluded?: boolean; localArea?: string | null;
  eligibility?: Record<string, unknown> | null;
};
const all = raw as unknown as Listing[];

describe('starter pack', () => {
  it('holds only live awards open across Alberta or Canada with nothing that narrows who can enter', () => {
    for (const id of STARTER_PACK_IDS) {
      const s = all.find(x => x.id === id);
      expect(s, `id ${id}`).toBeDefined();
      expect(['Alberta', 'National'], s!.title).toContain(s!.region);
      expect(s!.concluded ?? false, s!.title).toBe(false);
      expect(s!.localArea ?? null, s!.title).toBeNull();
      const e = s!.eligibility ?? {};
      for (const k of ['minAverage', 'genderRequired', 'maxFamilyIncome']) expect(e[k] ?? null, `${s!.title} ${k}`).toBeNull();
      for (const k of ['financialNeed', 'indigenousRequired', 'bipocRequired', 'fosterCare', 'apprenticeship']) expect(e[k] ?? false, `${s!.title} ${k}`).toBe(false);
      for (const k of ['schoolBoards', 'specificSchools', 'fields', 'extracurriculars']) expect(e[k] ?? [], `${s!.title} ${k}`).toEqual([]);
    }
  });

  describe('seeding', () => {
    beforeEach(() => { localStorage.clear(); });
    const fresh = async () => { const { vi } = await import('vitest'); vi.resetModules(); return import('./tracker'); };

    it('adds the pack once, after anything already saved', async () => {
      localStorage.setItem('scholarab_saved', JSON.stringify([999]));
      const t = await fresh();
      t.seedStarterPack();
      expect(t.getSaved()).toEqual([999, ...STARTER_PACK_IDS]);
      expect(localStorage.getItem(STARTER_PACK_KEY)).toBe('1');
    });

    it('does not bring back an award the student removed', async () => {
      const t = await fresh();
      t.seedStarterPack();
      t.toggleSaved(STARTER_PACK_IDS[0]);
      t.seedStarterPack();
      expect(t.getSaved()).not.toContain(STARTER_PACK_IDS[0]);
    });
  });
});
