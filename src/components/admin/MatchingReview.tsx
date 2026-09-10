import MatchingEnginePreview from './MatchingEnginePreview';
import { useEffect, useState } from 'react';
import type { Coverage } from '../../lib/matching/store';
import type { MatchingDocument } from '../../lib/matching/schema';
import { matchingSchema } from '../../lib/matching/schema';
import type { Opportunity } from '../../lib/matching/normalize';
type Selection = {
  kind: 'scholarship' | 'program';
  id: number;
  revision: number;
  hasDraft: boolean;
  deleted: boolean;
  preview: Opportunity;
};
const input = 'block w-full rounded border border-white/20 bg-[#15151c] p-2 text-white';
export default function MatchingReview() {
  const [coverage, setCoverage] = useState<Coverage | null>(null),
    [error, setError] = useState(''),
    [query, setQuery] = useState(''),
    [page, setPage] = useState(0);
  const [selection, setSelection] = useState<Selection | null>(null),
    [document, setDocument] = useState<MatchingDocument | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  async function refresh() {
    const r = await fetch('/admin/api/matching');
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    setCoverage(data);
  }
  useEffect(() => {
    let active = true;
    fetch('/admin/api/matching')
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        if (active) setCoverage(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  async function open(kind: string, id: number) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const r = await fetch(`/admin/api/matching?kind=${kind}&id=${id}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setSelection(data);
      setDocument(data.preview.matching);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load');
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!selection || !document) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const validated = matchingSchema.parse(document);
      const r = await fetch(
        `/admin/api/${selection.kind === 'scholarship' ? 'scholarships' : 'programs'}/${selection.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ revision: selection.revision, matching: validated }),
        }
      );
      const result = await r.json();
      if (!r.ok) throw new Error(result.error);
      setSelection({ ...selection, revision: result.revision, hasDraft: true });
      setMessage('Saved as a draft. Review and publish when ready.');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save');
    } finally {
      setBusy(false);
    }
  }
  function evidenceEditor(
    label: string,
    evidence: MatchingDocument['coverageEvidence'],
    change: (value: MatchingDocument['coverageEvidence']) => void
  ) {
    return (
      <fieldset className="space-y-2 border border-white/15 p-3">
        <legend>{label}</legend>
        <label className="block">
          Review status
          <select
            className={input}
            value={evidence.status}
            onChange={(e) =>
              change({ ...evidence, status: e.target.value as typeof evidence.status })
            }
          >
            {['legacy-unreviewed', 'reviewed', 'ambiguous', 'stale'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="block">
          Official source URL
          <input
            className={input}
            value={evidence.sourceUrl ?? ''}
            onChange={(e) => change({ ...evidence, sourceUrl: e.target.value || null })}
          />
        </label>
        <label className="block">
          Supporting excerpt
          <textarea
            className={input}
            value={evidence.excerpt}
            onChange={(e) => change({ ...evidence, excerpt: e.target.value })}
          />
        </label>
        <label className="block">
          Verified on
          <input
            type="date"
            className={input}
            value={evidence.verifiedAt ?? ''}
            onChange={(e) => change({ ...evidence, verifiedAt: e.target.value || null })}
          />
        </label>
      </fieldset>
    );
  }
  const queue =
    coverage?.queue.filter((r) =>
      `${r.key} ${r.title}`.toLowerCase().includes(query.toLowerCase())
    ) ?? [];
  const parsed = document ? matchingSchema.safeParse(document) : null;
  return (
    <section className="space-y-5 max-w-5xl">
      <h1 className="text-2xl font-bold">Matching catalogue review</h1>
      <p>
        Source review and Phase 2 engine preview. The public quiz still uses its existing engine
        until the redesigned experience is ready.
      </p>
      {error && (
        <p role="alert" className="text-red-300 whitespace-pre-wrap">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {!coverage ? (
        <button onClick={() => void refresh().catch((e) => setError(e.message))}>
          Loading coverage… Retry
        </button>
      ) : (
        <>
          <p>
            Published snapshot: {coverage.counts.scholarship} scholarships ·{' '}
            {coverage.counts.program} programs. Database comparison:{' '}
            <strong>{coverage.comparison}</strong>. Publication: {coverage.publicationStatus}.
          </p>
          <p>
            Drafts: {coverage.records.filter((r) => r.hasDraft).length} · Archived canonical
            records: {coverage.records.filter((r) => r.state === 'archived').length} · Unresolved
            draft/record previews: {coverage.queue.filter((r) => r.issues.length > 0).length}.
          </p>
          <p className="text-xs break-all">Deployed catalogue hash: {coverage.catalogueHash}</p>
          {coverage.drift.length > 0 && (
            <pre className="overflow-auto">{coverage.drift.join('\n')}</pre>
          )}
          <details>
            <summary>Legacy mappings and archived history ({coverage.legacy.length})</summary>
            <ul>
              {coverage.legacy
                .filter((r) => r.state !== 'mapped')
                .map((r) => (
                  <li key={`${r.kind}:${r.legacyId}`}>
                    {r.kind}:{r.legacyId} · {r.title} · {r.state}
                  </li>
                ))}
            </ul>
            <p>
              {coverage.legacy.filter((r) => r.state === 'mapped').length} legacy rows have
              canonical mappings.
            </p>
          </details>
          {!selection && (
            <>
              <label className="block">
                Search every scholarship and program
                <input
                  className={input}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(0);
                  }}
                />
              </label>
              <p>
                {queue.length} records. Queue ordered by validation problems, then recorded deadline
                (including past dates).
              </p>
              <ul className="space-y-2">
                {queue.slice(page * 25, (page + 1) * 25).map((r) => (
                  <li key={r.key}>
                    <button
                      disabled={busy}
                      className="text-left underline"
                      onClick={() => void open(r.kind, r.id)}
                    >
                      {r.title} ({r.key})
                    </button>{' '}
                    · {r.hasDraft ? 'Draft · ' : ''}
                    {r.deleted ? 'Pending deletion · ' : ''}
                    {r.issues.length} review flags
                  </li>
                ))}
              </ul>
              <div className="flex gap-4">
                <button disabled={!page} onClick={() => setPage(page - 1)}>
                  Previous
                </button>
                <span>Page {page + 1}</span>
                <button
                  disabled={(page + 1) * 25 >= queue.length}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </>
      )}
      {selection && document && (
        <div className="space-y-4">
          <button
            disabled={busy}
            className="underline"
            onClick={() => {
              setSelection(null);
              setDocument(null);
              setError('');
            }}
          >
            Back to coverage (discard unsaved changes)
          </button>
          <h2 className="text-xl">
            {selection.preview.title} · {selection.preview.key}
          </h2>
          <p>
            Revision {selection.revision} ·{' '}
            {selection.hasDraft ? 'Draft preview' : 'Published record'}
            {selection.deleted ? ' · pending deletion' : ''}
          </p>
          <a href={selection.preview.url} target="_blank" rel="noreferrer" className="underline">
            Read official provider source
          </a>
          <p>
            Nothing is marked reviewed automatically. Confirm the provider's complete criteria
            before declaring reviewed coverage. Evidence excerpts entered here become public when
            published.
          </p>
          <label className="block">
            Requirement coverage
            <select
              className={input}
              value={document.coverage}
              onChange={(e) =>
                setDocument({ ...document, coverage: e.target.value as 'partial' | 'reviewed' })
              }
            >
              <option value="partial">Partial / needs review</option>
              <option value="reviewed">Reviewed against provider source</option>
            </select>
          </label>
          {evidenceEditor(
            'Evidence for completeness of requirements',
            document.coverageEvidence,
            (evidence) => setDocument({ ...document, coverageEvidence: evidence })
          )}
          {document.requirements.map((r, i) => (
            <details key={r.id} className="border border-white/15 p-3">
              <summary>
                {r.field}: {r.explanation} ({r.evidence.status})
              </summary>
              <div className="space-y-3 pt-3">
                <label className="block">
                  Requirement strength
                  <select
                    className={input}
                    value={r.importance}
                    onChange={(e) =>
                      setDocument({
                        ...document,
                        requirements: document.requirements.map((v, j) =>
                          j === i ? { ...v, importance: e.target.value as typeof r.importance } : v
                        ),
                      })
                    }
                  >
                    {['unknown', 'mandatory', 'preference'].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  Explanation
                  <input
                    className={input}
                    value={r.explanation}
                    onChange={(e) =>
                      setDocument({
                        ...document,
                        requirements: document.requirements.map((v, j) =>
                          j === i ? { ...v, explanation: e.target.value } : v
                        ),
                      })
                    }
                  />
                </label>
                <label className="block">
                  Provider reference date (required for reviewed age rules)
                  <input
                    type="date"
                    className={input}
                    value={r.referenceDate ?? ''}
                    onChange={(e) =>
                      setDocument({
                        ...document,
                        requirements: document.requirements.map((v, j) =>
                          j === i ? { ...v, referenceDate: e.target.value || null } : v
                        ),
                      })
                    }
                  />
                </label>
                <pre className="whitespace-pre-wrap">{JSON.stringify(r.condition, null, 2)}</pre>
                {evidenceEditor('Requirement evidence', r.evidence, (evidence) =>
                  setDocument({
                    ...document,
                    requirements: document.requirements.map((v, j) =>
                      j === i ? { ...v, evidence } : v
                    ),
                  })
                )}
              </div>
            </details>
          ))}
          {evidenceEditor(
            'Application-window evidence',
            document.availability.evidence,
            (evidence) =>
              setDocument({ ...document, availability: { ...document.availability, evidence } })
          )}
          <details>
            <summary>Advanced: edit conditions, groups, and application dates</summary>
            <p>
              Use the version 1 JSON contract. The preview validates all references and evidence
              before saving.
            </p>
            <JsonEditor value={document} onApply={setDocument} />
          </details>
          <MatchingEnginePreview opportunity={{ ...selection.preview, matching: document }} />
          <details>
            <summary>Normalized draft preview</summary>
            <pre className="overflow-auto whitespace-pre-wrap">
              {JSON.stringify(document, null, 2)}
            </pre>
          </details>
          {parsed && !parsed.success && (
            <p role="status" className="text-amber-300">
              {parsed.error.issues.map((i) => i.message).join('; ')}
            </p>
          )}
          <button
            className="rounded bg-emerald-400 px-4 py-2 text-black disabled:opacity-40"
            disabled={busy || selection.deleted || !parsed?.success}
            onClick={() => void save()}
          >
            {busy ? 'Saving…' : 'Save reviewed fields as draft'}
          </button>
        </div>
      )}
    </section>
  );
}
function JsonEditor({
  value,
  onApply,
}: {
  value: MatchingDocument;
  onApply: (v: MatchingDocument) => void;
}) {
  const [raw, setRaw] = useState(() => JSON.stringify(value, null, 2)),
    [error, setError] = useState('');
  return (
    <div>
      <button
        onClick={() => {
          setRaw(JSON.stringify(value, null, 2));
          setError('');
        }}
      >
        Load current form into JSON editor
      </button>
      <textarea
        aria-label="Matching contract JSON"
        className={`${input} min-h-80 font-mono`}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
      />
      <button
        onClick={() => {
          try {
            onApply(matchingSchema.parse(JSON.parse(raw)));
            setError('');
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Invalid contract');
          }
        }}
      >
        Validate and apply JSON to form
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
