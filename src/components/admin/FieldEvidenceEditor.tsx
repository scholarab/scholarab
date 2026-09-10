import { useState } from 'react';
import { EMPTY_ELIGIBILITY } from '../../lib/eligibility-types';
import type { EligibilityEvidence, EligibilityEvidenceKey } from '../../lib/matching/field-evidence';

const input = 'block w-full rounded border border-white/20 bg-[#15151c] p-2 text-white';
const labels: Record<EligibilityEvidenceKey, string> = {
  grades: 'Education grades', schoolBoards: 'School boards', specificSchools: 'Specific schools',
  targetInstitutions: 'Post-secondary institutions', fields: 'Fields of study',
  minAverage: 'Minimum academic average', minAge: 'Minimum age', maxAge: 'Maximum age',
  genderRequired: 'Gender criterion', indigenousRequired: 'Indigenous criterion',
  bipocRequired: 'BIPOC criterion', financialNeed: 'Financial need',
  maxFamilyIncome: 'Maximum family income', fosterCare: 'Foster care criterion',
  citizenship: 'Citizenship', apprenticeship: 'Apprenticeship', extracurriculars: 'Activities',
};
type Entry = NonNullable<EligibilityEvidence[EligibilityEvidenceKey]>;

export default function FieldEvidenceEditor({
  value, onChange, onValidityChange,
}: {
  value: EligibilityEvidence;
  onChange: (value: EligibilityEvidence) => void;
  onValidityChange: (valid: boolean) => void;
}) {
  const [rawValues, setRawValues] = useState<Partial<Record<EligibilityEvidenceKey, string>>>({});
  const [jsonErrors, setJsonErrors] = useState<Partial<Record<EligibilityEvidenceKey, string>>>({});
  function errorsFor(key: EligibilityEvidenceKey, message?: string) {
    const next = { ...jsonErrors };
    if (message) next[key] = message;
    else delete next[key];
    setJsonErrors(next);
    onValidityChange(Object.keys(next).length === 0);
  }
  function update(key: EligibilityEvidenceKey, entry: Entry, reviewAction = false) {
    // A change to the approved value/source needs another explicit human review.
    const next = !reviewAction && entry.status === 'reviewed'
      ? { ...entry, status: 'partial' as const }
      : entry;
    onChange({ ...value, [key]: next } as EligibilityEvidence);
  }
  return (
    <section className="space-y-3" aria-label="Field evidence">
      <h3 className="text-lg font-bold">Evidence for individual eligibility fields</h3>
      <p>
        Each field has its own source and review status. A gate can exclude a student only
        after human review; a signal supplies discovery context. New entries start as partial signals.
        Empty values do not establish eligibility or the absence of a restriction.
      </p>
      {(Object.keys(labels) as EligibilityEvidenceKey[]).map((key) => {
        const entry = value[key];
        const label = labels[key];
        return (
          <details key={key} className="border border-white/15 p-3">
            <summary>{label} ({entry ? `${entry.tier} · ${entry.status}` : 'No field evidence'})</summary>
            <fieldset className="space-y-3 pt-3">
              <legend className="sr-only">{label}</legend>
              <label className="block">
                <input
                  type="checkbox"
                  checked={!!entry}
                  onChange={(e) => {
                    if (e.target.checked) {
                      update(key, {
                        value: structuredClone(EMPTY_ELIGIBILITY[key]), tier: 'signal',
                        status: 'partial', sourceUrl: null, summary: '', quote: '', verifiedAt: null,
                      });
                    } else {
                      const next = { ...value };
                      delete next[key];
                      onChange(next);
                    }
                    setRawValues((old) => { const next = { ...old }; delete next[key]; return next; });
                    errorsFor(key);
                  }}
                />{' '}Edit evidence for {label}
              </label>
              {entry && (
                <>
                  <label className="block">
                    {label}: value JSON
                    <textarea
                      className={`${input} font-mono`}
                      value={rawValues[key] ?? JSON.stringify(entry.value, null, 2)}
                      aria-invalid={!!jsonErrors[key]}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setRawValues((old) => ({ ...old, [key]: raw }));
                        try {
                          const parsed: unknown = JSON.parse(raw);
                          // Field type validation runs before preview and saving;
                          // retain valid JSON here while the user edits the form.
                          update(key, { ...entry, value: parsed } as Entry);
                          errorsFor(key);
                        } catch { errorsFor(key, 'Enter valid JSON before saving.'); }
                      }}
                    />
                  </label>
                  {jsonErrors[key] && <p role="alert">{label}: {jsonErrors[key]}</p>}
                  <p className="text-sm">Use exact provider values: arrays for lists, numbers for thresholds, true/false for boolean criteria, and quoted strings for citizenship or gender.</p>
                  <label className="block">
                    {label}: use
                    <select className={input} value={entry.tier} onChange={(e) => update(key, { ...entry, tier: e.target.value as Entry['tier'] })}>
                      <option value="signal">Signal: discovery context</option>
                      <option value="gate">Gate: proposed eligibility restriction</option>
                    </select>
                  </label>
                  <label className="block">
                    {label}: review status
                    <select className={input} value={entry.status} onChange={(e) => update(key, { ...entry, status: e.target.value as Entry['status'] }, true)}>
                      <option value="partial">Partial: awaiting human review</option>
                      <option value="reviewed">Reviewed: I checked the provider evidence</option>
                      <option value="legacy-unreviewed">Legacy: unreviewed</option>
                      <option value="ambiguous">Ambiguous</option>
                      <option value="stale">Stale</option>
                    </select>
                  </label>
                  <p className="text-sm">Select reviewed only after a human checks this value, verbatim quotation, source, qualification basis and date. Entering a quote does not approve it.</p>
                  <label className="block">
                    {label}: provider quotation (verbatim)
                    <textarea className={input} value={entry.quote} onChange={(e) => update(key, { ...entry, quote: e.target.value })} />
                  </label>
                  <label className="block">
                    {label}: summary (your own words)
                    <textarea className={input} value={entry.summary} onChange={(e) => update(key, { ...entry, summary: e.target.value })} />
                  </label>
                  <label className="block">
                    {label}: official source URL
                    <input className={input} value={entry.sourceUrl ?? ''} onChange={(e) => update(key, { ...entry, sourceUrl: e.target.value || null })} />
                  </label>
                  <label className="block">
                    {label}: verified on
                    <input type="date" className={input} value={entry.verifiedAt ?? ''} onChange={(e) => update(key, { ...entry, verifiedAt: e.target.value || null })} />
                  </label>
                  <label className="block">
                    {label}: expires on (optional)
                    <input type="date" className={input} value={entry.expiresOn ?? ''} onChange={(e) => update(key, { ...entry, expiresOn: e.target.value || null })} />
                  </label>
                  <label className="block">
                    {label}: qualification basis (when required)
                    <input className={input} value={entry.basis ?? ''} onChange={(e) => update(key, { ...entry, basis: e.target.value || undefined })} />
                  </label>
                  <label className="block">
                    {label}: provider reference date (age gates)
                    <input type="date" className={input} value={entry.referenceDate ?? ''} onChange={(e) => update(key, { ...entry, referenceDate: e.target.value || null })} />
                  </label>
                  <label className="block">
                    {label}: question answer key (when required)
                    <input className={input} value={entry.answerKey ?? ''} onChange={(e) => update(key, { ...entry, answerKey: e.target.value || undefined })} />
                  </label>
                </>
              )}
            </fieldset>
          </details>
        );
      })}
    </section>
  );
}
