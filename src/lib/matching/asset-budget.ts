/** Build-output limits, separate from the quiz's compressed transfer budgets.
 * The September 2026 baseline was 79 files, 16.86 MB total, and a 131.1 KB
 * largest evidence pack. These limits leave room for backfill while requiring
 * an explicit review before output grows substantially. Never drop evidence
 * or catalogue identities to fit a limit.
 */
export const MATCHING_ASSET_BUDGET = {
  maxFiles: 128,
  maxTotalBytes: 24 * 1024 * 1024,
  maxEvidencePackBytes: 256 * 1024,
} as const;

export interface MatchingAssetBudget {
  maxFiles: number;
  maxTotalBytes: number;
  maxEvidencePackBytes: number;
}

export interface MatchingAssetSize {
  /** Relative to the generated matching directory, using forward slashes. */
  path: string;
  bytes: number;
}

/** Check the complete on-disk inventory, including unexpected or stale files. */
export function assertMatchingAssetBudget(
  assets: readonly MatchingAssetSize[],
  expectedPaths: readonly string[],
  budget: MatchingAssetBudget = MATCHING_ASSET_BUDGET
) {
  const paths = new Set<string>();
  for (const asset of assets) {
    if (paths.has(asset.path)) throw new Error(`Duplicate matching asset: ${asset.path}`);
    if (!Number.isSafeInteger(asset.bytes) || asset.bytes < 0)
      throw new Error(`Invalid matching asset size: ${asset.path}`);
    paths.add(asset.path);
  }
  const expected = new Set(expectedPaths);
  const unexpected = [...paths].filter((path) => !expected.has(path));
  const missing = [...expected].filter((path) => !paths.has(path));
  if (unexpected.length || missing.length)
    throw new Error(
      `Matching asset inventory mismatch; unexpected/stale: ${unexpected.join(', ') || 'none'}; missing: ${missing.join(', ') || 'none'}`
    );

  const evidence = assets.filter((asset) => asset.path.startsWith('evidence/'));
  const largestEvidencePack = evidence.reduce<MatchingAssetSize | null>(
    (largest, asset) => (!largest || asset.bytes > largest.bytes ? asset : largest),
    null
  );
  const report = {
    fileCount: assets.length,
    totalBytes: assets.reduce((sum, asset) => sum + asset.bytes, 0),
    evidencePackCount: evidence.length,
    evidenceBytes: evidence.reduce((sum, asset) => sum + asset.bytes, 0),
    largestEvidencePack,
    budget,
  };
  const failures = [
    report.fileCount > budget.maxFiles
      ? `file count ${report.fileCount} exceeds ${budget.maxFiles}`
      : null,
    report.totalBytes > budget.maxTotalBytes
      ? `total bytes ${report.totalBytes} exceeds ${budget.maxTotalBytes}`
      : null,
    largestEvidencePack && largestEvidencePack.bytes > budget.maxEvidencePackBytes
      ? `evidence pack ${largestEvidencePack.path} is ${largestEvidencePack.bytes} bytes, exceeds ${budget.maxEvidencePackBytes}`
      : null,
  ].filter(Boolean);
  if (failures.length)
    throw new Error(`Matching asset budget exceeded: ${failures.join('; ')}. Review output growth; do not truncate evidence or identities.`);
  return report;
}
