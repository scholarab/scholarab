import { describe, expect, it } from 'vitest';
import { assertMatchingAssetBudget, MATCHING_ASSET_BUDGET } from './asset-budget';

const assets = [
  { path: 'manifest.json', bytes: 10 },
  { path: 'core.digest.json', bytes: 20 },
  { path: 'opportunities.digest.json', bytes: 30 },
  { path: 'evidence/digest.json', bytes: 40 },
];
const expected = assets.map((asset) => asset.path);
const exactBudget = { maxFiles: 4, maxTotalBytes: 100, maxEvidencePackBytes: 40 };

describe('generated matching asset budget', () => {
  it('accepts exact ceilings and reports complete output including evidence', () => {
    expect(assertMatchingAssetBudget(assets, expected, exactBudget)).toEqual({
      fileCount: 4,
      totalBytes: 100,
      evidencePackCount: 1,
      evidenceBytes: 40,
      largestEvidencePack: assets[3],
      budget: exactBudget,
    });
  });

  it.each([
    [{ ...exactBudget, maxFiles: 3 }, /file count 4 exceeds 3/],
    [{ ...exactBudget, maxTotalBytes: 99 }, /total bytes 100 exceeds 99/],
    [{ ...exactBudget, maxEvidencePackBytes: 39 }, /evidence pack.*40 bytes, exceeds 39/],
  ])('fails an exceeded limit without dropping any output', (budget, message) => {
    expect(() => assertMatchingAssetBudget(assets, expected, budget)).toThrow(message);
    expect(assets).toHaveLength(4);
  });

  it('rejects stale output even when its bytes fit the budget', () => {
    expect(() => assertMatchingAssetBudget([
      ...assets,
      { path: 'evidence/old-digest.json', bytes: 1 },
    ], expected)).toThrow(/unexpected\/stale: evidence\/old-digest.json/);
  });

  it('rejects missing expected output instead of reporting an improved size', () => {
    expect(() => assertMatchingAssetBudget(assets.slice(0, -1), expected)).toThrow(
      /missing: evidence\/digest.json/
    );
  });

  it('rejects duplicate inventory entries and invalid sizes', () => {
    expect(() => assertMatchingAssetBudget([...assets, assets[0]!], expected)).toThrow(/Duplicate/);
    expect(() => assertMatchingAssetBudget([{ path: 'manifest.json', bytes: -1 }], ['manifest.json']))
      .toThrow(/Invalid matching asset size/);
  });

  it('sums all evidence while selecting the largest pack for its separate limit', () => {
    const secondPack = { path: 'evidence/another-digest.json', bytes: 50 };
    const report = assertMatchingAssetBudget([...assets, secondPack], [...expected, secondPack.path]);
    expect(report).toMatchObject({
      totalBytes: 150,
      evidencePackCount: 2,
      evidenceBytes: 90,
      largestEvidencePack: secondPack,
      budget: MATCHING_ASSET_BUDGET,
    });
  });
});
