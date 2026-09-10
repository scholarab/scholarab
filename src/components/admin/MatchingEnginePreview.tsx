import { useMemo, useState } from 'react';
import type { Opportunity } from '../../lib/matching/normalize';
import { createMatchingEngine } from '../../lib/matching/engine';
import { profileSchema } from '../../lib/matching/types';
const example = JSON.stringify(
  {
    answers: {
      average: {
        state: 'answered',
        fact: {
          kind: 'number',
          min: 80,
          max: 89,
          minInclusive: true,
          maxInclusive: true,
          basis: 'admission-average',
        },
      },
    },
  },
  null,
  2
);
export default function MatchingEnginePreview({ opportunity }: { opportunity: Opportunity }) {
  const [raw, setRaw] = useState('{"answers":{}}');
  const [clock, setClock] = useState(() => new Date().toISOString());
  const result = useMemo(() => {
    try {
      return {
        assessment: createMatchingEngine([opportunity]).assess(
          profileSchema.parse(JSON.parse(raw)),
          { now: new Date(clock) }
        ).all[0],
        error: null,
      };
    } catch (e) {
      return { assessment: null, error: e instanceof Error ? e.message : 'Invalid preview input' };
    }
  }, [opportunity, raw, clock]);
  return (
    <details className="border border-white/15 p-3">
      <summary>Test matching eligibility engine</summary>
      <p className="my-3">
        Use synthetic answers to check the draft rules. Preview answers stay in this page’s memory
        and are not sent to the server. This does not change any listing or the public quiz.
      </p>
      <button className="underline" onClick={() => setRaw(example)}>
        Load example: 80–89 admission average
      </button>
      <label className="block my-3">
        Synthetic profile JSON
        <textarea
          className="block w-full min-h-48 bg-[#15151c] border border-white/20 p-2 font-mono"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />
      </label>
      <label className="block my-3">
        Evaluation time (ISO timestamp)
        <input
          className="block w-full bg-[#15151c] border border-white/20 p-2"
          value={clock}
          onChange={(e) => setClock(e.target.value)}
        />
      </label>
      {result.error ? (
        <p role="status">{result.error}</p>
      ) : (
        result.assessment && (
          <div role="status">
            <p>
              <strong>{result.assessment.eligibility.replaceAll('_', ' ')}</strong> ·{' '}
              {result.assessment.availability.status.replaceAll('_', ' ')}
            </p>
            <p>{result.assessment.availability.nextAction}</p>
            <p>{result.assessment.availability.note}</p>
            {!result.assessment.scopeReviewed && (
              <p>The complete requirement scope still needs source review.</p>
            )}
            <ul>
              {result.assessment.rules.map((r) => (
                <li className="my-2" key={r.id}>
                  <strong>
                    {r.id}: {r.state.replaceAll('_', ' ')}
                  </strong>{' '}
                  ({r.importance})<p>{r.explanation}</p>
                  {r.questionKey && <p>Answer key: {r.questionKey}</p>}
                </li>
              ))}
            </ul>
            <p>
              Alternative branches are evaluated as a group; an unused branch can fail without
              excluding the student.
            </p>
          </div>
        )
      )}
    </details>
  );
}
