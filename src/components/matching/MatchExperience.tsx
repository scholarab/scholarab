import { useEffect, useMemo, useRef, useState } from 'react';
import { createMatchingEngine } from '../../lib/matching/engine';
import {
  parseClientCatalogue,
  verifiedJSON,
  type ClientCatalogue,
} from '../../lib/matching/client-catalogue';
import {
  essentialProfile,
  freshSession,
  readSession,
  SESSION_KEY,
  TTL,
  type MatchSession,
} from '../../lib/matching/session';
import { nextQuestions, type FollowUp } from '../../lib/matching/questions';
import type { Profile } from '../../lib/matching/types';
import type { Assessment, SortMode } from '../../lib/matching/rank';
import type { Opportunity } from '../../lib/matching/normalize';
import { getSaved, getSavedPrograms, toggleSaved, toggleSavedProgram } from '../../lib/tracker';
import { QUIZ_STORAGE_KEY } from '../../lib/quiz';
import './matching.css';

const fieldLabel = (field: string) =>
  ({
    educationStage: 'Education stage',
    schoolBoard: 'School board',
    financialNeed: 'Financial need',
    familyIncome: 'Family income',
    manual: 'Provider requirement',
  })[field] ?? field.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
const labels = {
  meets_checked_requirements: 'Meets requirements we checked',
  worth_checking: 'Worth checking',
  known_ineligible: 'Doesn’t meet a known requirement',
};
export default function MatchExperience({
  catalogueHash,
  coreHash,
  count,
}: {
  catalogueHash: string;
  coreHash: string;
  count: number;
}) {
  const [session, setSession] = useState<MatchSession>(() => freshSession(catalogueHash));
  const [hydrated, setHydrated] = useState(false);
  const [data, setData] = useState<ClientCatalogue | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retry, setRetry] = useState(0);
  const [sort, setSort] = useState<SortMode>('best_fit');
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('plausible');
  const [limit, setLimit] = useState(5);
  const [compare, setCompare] = useState<string[]>([]);
  const [question, setQuestion] = useState<FollowUp | null>(null);
  const [clock, setClock] = useState(() => new Date());
  const heading = useRef<HTMLHeadingElement>(null);
  const currentSession = useRef(session);
  useEffect(() => {
    currentSession.current = session;
  }, [session]);
  useEffect(() => {
    try {
      // Hydration reads browser-only storage after the matching SSR render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSession(readSession(sessionStorage, catalogueHash));
      localStorage.removeItem(QUIZ_STORAGE_KEY);
    } catch {
      setNotice('Session storage is unavailable. You can still use matching in this page.');
    }
    setHydrated(true);
  }, [catalogueHash]);
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // Report an external storage failure without interrupting matching.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotice('Answers cannot be saved in this tab. Keep this page open while matching.');
    }
  }, [session, hydrated]);
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      setClock((previous) =>
        Math.floor(previous.getTime() / 60000) === Math.floor(now / 60000)
          ? previous
          : new Date(now)
      );
      if (currentSession.current.expiresAt <= now) {
        setSession(freshSession(catalogueHash, now));
        setQuestion(null);
        setCompare([]);
        setNotice(
          'Your answer session expired and was cleared. Saved listings are still available.'
        );
        try {
          sessionStorage.removeItem(SESSION_KEY);
        } catch {
          /* optional persistence */
        }
      }
    };
    const interval = window.setInterval(check, 1000);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [catalogueHash]);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/matching/core.${coreHash}.json`, { signal: controller.signal })
      .then((r) => verifiedJSON(r, coreHash))
      .then((raw) => {
        const parsed = parseClientCatalogue(raw, catalogueHash);
        if (parsed.opportunities.length !== count)
          throw new Error('Incomplete catalogue. Reload this page.');
        if (!controller.signal.aborted) setData(parsed);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : 'Unable to load matching.');
      });
    return () => controller.abort();
  }, [coreHash, catalogueHash, count, retry]);
  useEffect(() => {
    if (session.ready) heading.current?.focus();
  }, [session.ready]);
  const engine = useMemo(() => (data ? createMatchingEngine(data.opportunities) : null), [data]);
  const profile = useMemo(() => essentialProfile(session), [session]);
  // Calendar-day updates need assessment; a ticking timer must not reevaluate
  // thousands of rules every second.
  const minute = clock.toISOString().slice(0, 16);
  const evaluated = useMemo(
    () => engine?.assess(profile, { now: new Date(`${minute}:00Z`), sort }),
    [engine, profile, minute, sort]
  );
  const visibleKind = (a: Assessment) =>
    session.intent === 'both' ||
    a.kind === (session.intent === 'programs' ? 'program' : 'scholarship');
  const filtered =
    evaluated?.all.filter(
      (a) =>
        visibleKind(a) &&
        a.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()) &&
        (group === 'all' ||
          (group === 'excluded'
            ? a.eligibility === 'known_ineligible'
            : a.eligibility !== 'known_ineligible'))
    ) ?? [];
  const candidates =
    data && evaluated
      ? nextQuestions(
          data.opportunities,
          evaluated.all.filter(visibleKind),
          profile,
          session.attempted,
          session.personal
        )
      : [];
  const update = (change: Partial<MatchSession>) => {
    if (session.expiresAt <= Date.now()) {
      setSession(freshSession(catalogueHash));
      setQuestion(null);
      return;
    }
    setSession((s) => ({ ...s, ...change }));
  };
  const essentials = (change: Partial<MatchSession>) => {
    update({ ...change, profile: { answers: {} }, attempted: [] });
    setLimit(5);
    setQuestion(null);
  };
  const end = () => {
    setSession(freshSession(catalogueHash));
    setCompare([]);
    setQuestion(null);
    setSearch('');
    setLimit(5);
    try {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(QUIZ_STORAGE_KEY);
    } catch {
      /* optional persistence */
    }
    setNotice('Answers cleared. Saved listings are kept separately.');
  };
  const answer = (value: Profile['answers'][string]) => {
    if (!question) return;
    update({
      profile: { answers: { ...session.profile.answers, [question.key]: value } },
      attempted: [...session.attempted, question.key],
    });
    setQuestion(null); // Every optional answer returns to results; never a loop.
    heading.current?.focus();
  };
  return (
    <div
      className="match-experience"
      data-catalogue-ready={data ? 'true' : 'false'}
      data-catalogue-count={data?.opportunities.length}
    >
      <div className="match-topline">
        <span>NEW MATCHING · PREVIEW</span>
        <a href="/saved/">Your saved applications →</a>
      </div>
      <p className="match-privacy">
        Answers stay in this tab for one hour unless you extend the session. No account required.{' '}
        <button onClick={end}>End answer session</button>
        <button
          onClick={() => {
            if (session.expiresAt <= Date.now()) {
              end();
              return;
            }
            update({ expiresAt: Date.now() + TTL });
            setNotice('Answer session extended for one hour. You can clear it at any time.');
          }}
        >
          Keep answers for another hour
        </button>
      </p>
      {hydrated && session.expiresAt - clock.getTime() < 120000 && (
        <p role="alert">
          Your answers will expire shortly. Choose “Keep answers for another hour” to continue, or
          let this session clear automatically.
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {!session.ready ? (
        <form
          className="match-panel"
          onSubmit={(e) => {
            e.preventDefault();
            update({ ready: true });
          }}
        >
          <h2>Three things to get started.</h2>
          <p>
            You can skip anything you’re unsure about. We’ll tell you what still needs checking.
          </p>
          <label>
            1. What are you looking for?
            <select
              required
              disabled={!hydrated}
              value={session.intent}
              onChange={(e) => essentials({ intent: e.target.value })}
            >
              <option value="" disabled>
                Choose an option
              </option>
              <option value="both">Scholarships and programs</option>
              <option value="scholarships">Scholarships</option>
              <option value="programs">Programs</option>
            </select>
          </label>
          <label>
            2. What is your current education stage?
            <select
              required
              disabled={!hydrated}
              value={session.stage}
              onChange={(e) => essentials({ stage: e.target.value })}
            >
              <option value="" disabled>
                Choose a stage
              </option>
              {[
                ['10', 'Grade 10'],
                ['11', 'Grade 11'],
                ['12', 'Grade 12'],
                ['post-secondary', 'Post-secondary'],
                ['apprentice', 'Apprenticeship'],
                ['other', 'Another stage'],
                ['not-sure', 'Not sure / skip'],
              ].map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            3. Which community do you currently live in?
            <input
              required
              maxLength={300}
              disabled={!hydrated}
              value={session.community}
              placeholder="For example, Medicine Hat"
              onChange={(e) => essentials({ community: e.target.value })}
            />
          </label>
          <button type="button" onClick={() => essentials({ community: 'not-sure' })}>
            Skip community
          </button>
          <button
            className="match-primary"
            disabled={!hydrated || !session.intent || !session.stage || !session.community.trim()}
          >
            Show opportunities →
          </button>
        </form>
      ) : (
        <>
          <div className="match-summary">
            <span>
              {session.intent} · {session.stage} ·{' '}
              {session.community === 'not-sure' ? 'Community skipped' : session.community}
            </span>
            <button onClick={() => update({ ready: false })}>Edit answers</button>
          </div>
          {session.attempted.length > 0 && (
            <details>
              <summary>Your optional answers ({session.attempted.length})</summary>
              {Object.entries(session.profile.answers).map(([key, a]) => (
                <p key={key}>
                  {key}:{' '}
                  {a.state === 'answered'
                    ? a.fact.kind === 'choices'
                      ? a.fact.values.join(', ')
                      : a.fact.kind === 'boolean'
                        ? String(a.fact.value)
                        : `${a.fact.min ?? '…'}–${a.fact.max ?? '…'}`
                    : a.state}{' '}
                  <button
                    onClick={() => {
                      const answers = { ...session.profile.answers };
                      delete answers[key];
                      update({
                        profile: { answers },
                        attempted: session.attempted.filter((k) => k !== key),
                      });
                    }}
                  >
                    Remove answer
                  </button>
                </p>
              ))}
            </details>
          )}
          <h2 ref={heading} tabIndex={-1}>
            Your opportunities to explore
          </h2>
          <p>
            Every one of the {count.toLocaleString()} published listings is assessed. “Worth
            checking” means something is unresolved; it is not confirmed eligibility or a prediction
            of winning.
          </p>
          {evaluated && !evaluated.all.some((a) => a.scopeReviewed) && (
            <p className="match-caution">
              Eligibility source review is still in progress across this catalogue. Your answers
              cannot confirm unreviewed requirements. Use the listing and provider instructions to
              check them.
            </p>
          )}
          <div className="match-panel">
            <h3>Make the list more useful</h3>
            <label className="match-inline">
              <input
                type="checkbox"
                checked={session.personal}
                onChange={(e) => {
                  const personal = e.target.checked;
                  update({
                    personal,
                    ...(!personal ? { profile: { answers: {} } } : {}),
                  });
                  setQuestion(null);
                }}
              />{' '}
              Offer optional questions about personal eligibility topics
            </label>
            <p>
              Identity, citizenship, membership and financial need are optional. We never infer
              them. Switching this off clears optional answers.
            </p>
            {question ? (
              <Refinement
                key={`${question.key}:${question.rule.id}`}
                question={question}
                onAnswer={answer}
              />
            ) : (
              <>
                <button
                  disabled={!candidates.length}
                  onClick={() => setQuestion(candidates[0] ?? null)}
                >
                  Check one more requirement
                </button>
                <p>
                  {candidates.length
                    ? `${candidates.length} useful follow-up topics available. Each answer returns you to your results.`
                    : 'No further source-supported questions are available for these results.'}
                </p>
              </>
            )}
          </div>
          {error ? (
            <div role="alert">
              <p>{error}</p>
              <button onClick={() => (setError(''), setRetry((r) => r + 1))}>Retry loading</button>
              <button onClick={() => window.location.reload()}>Reload page</button>
            </div>
          ) : !data ? (
            <p role="status">
              Loading the complete catalogue… You can edit your answers while we load.
            </p>
          ) : (
            <>
              <div className="match-filters">
                <label>
                  Search listings
                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setLimit(5);
                    }}
                  />
                </label>
                <label>
                  Order
                  <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)}>
                    <option value="best_fit">Best fit</option>
                    <option value="closing_soon">Closing soon</option>
                    <option value="local">Local opportunities</option>
                  </select>
                </label>
                <label>
                  Show
                  <select
                    value={group}
                    onChange={(e) => {
                      setGroup(e.target.value);
                      setLimit(5);
                    }}
                  >
                    <option value="plausible">Plausible opportunities</option>
                    <option value="excluded">Known requirement not met</option>
                    <option value="all">Every listing</option>
                  </select>
                </label>
              </div>
              <p role="status">
                {filtered.length} listings · Showing {Math.min(limit, filtered.length)}
              </p>
              {compare.length > 0 && (
                <section className="match-panel" aria-label="Compare opportunities">
                  <h3>Compare ({compare.length}/3)</h3>
                  <div className="match-compare">
                    {compare.map((key) => {
                      const a = evaluated!.all.find((a) => a.key === key)!;
                      const o = data.opportunities.find((o) => o.key === key)!;
                      return (
                        <article key={key}>
                          <h4>{a.title}</h4>
                          <p>{o.amount || o.stipend || 'Amount not listed'}</p>
                          <p>{labels[a.eligibility]}</p>
                          <p>
                            {a.availability.status.replaceAll('_', ' ')} ·{' '}
                            {a.unresolvedRequirements.length} unresolved checks
                          </p>
                          <p>{a.availability.nextAction}</p>
                          <a href={a.detailPath}>Full listing and application steps</a>
                          <button onClick={() => setCompare((c) => c.filter((k) => k !== key))}>
                            Remove {a.title}
                          </button>
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}
              {!filtered.length && (
                <p>
                  No listings in this view. Clear the search or choose “Every listing” to inspect
                  all assessments.
                </p>
              )}
              <div className="match-results">
                {filtered.slice(0, limit).map((a) => (
                  <OpportunityCard
                    key={a.key}
                    assessment={a}
                    opportunity={data.opportunities.find((o) => o.key === a.key)!}
                    catalogueHash={catalogueHash}
                    evidenceHash={data.evidence[a.key]!}
                    compared={compare.includes(a.key)}
                    compareDisabled={compare.length === 3 && !compare.includes(a.key)}
                    onCompare={() =>
                      setCompare((c) =>
                        c.includes(a.key) ? c.filter((k) => k !== a.key) : [...c, a.key]
                      )
                    }
                  />
                ))}
              </div>
              {limit < filtered.length && (
                <button className="match-primary" onClick={() => setLimit((n) => n + 20)}>
                  Show 20 more
                </button>
              )}
            </>
          )}
        </>
      )}
      {!session.ready && error && (
        <p role="alert">
          {error}{' '}
          <button onClick={() => (setError(''), setRetry((r) => r + 1))}>Retry loading</button>
        </p>
      )}
      <p className="match-directory">
        Prefer to browse? <a href="/scholarships/">Scholarships</a> ·{' '}
        <a href="/programs/">Programs</a> · <a href="/deadlines/">Deadline calendar</a>
      </p>
    </div>
  );
}
function Refinement({
  question: q,
  onAnswer,
}: {
  question: FollowUp;
  onAnswer: (answer: Profile['answers'][string]) => void;
}) {
  const [value, setValue] = useState('');
  const condition = q.rule.condition;
  const submit = () => {
    const qualifiers = {
      ...(q.rule.basis ? { basis: q.rule.basis } : {}),
      ...(q.rule.referenceDate ? { asOf: q.rule.referenceDate } : {}),
    };
    if (condition.operator === 'equals')
      onAnswer({
        state: 'answered',
        fact: { kind: 'boolean', value: value === 'yes', ...qualifiers },
      });
    else if (condition.operator === 'oneOf')
      onAnswer({
        state: 'answered',
        fact: {
          kind: 'choices',
          values: [value.trim()],
          mode: 'actual',
          complete: true,
          ...qualifiers,
        },
      });
    else
      onAnswer({
        state: 'answered',
        fact: {
          kind: 'number',
          min: Number(value),
          max: Number(value),
          minInclusive: true,
          maxInclusive: true,
          ...qualifiers,
        },
      });
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h4>{q.opportunity.title}</h4>
      <p>{q.rule.explanation}</p>
      <p>
        Can clarify {q.affected} requirement checks.{' '}
        {q.rule.basis && `Answer basis: ${q.rule.basis}.`}{' '}
        {q.rule.referenceDate && `As of ${q.rule.referenceDate}.`}
      </p>
      <a href={q.rule.evidence.sourceUrl!} target="_blank" rel="noreferrer">
        Read the provider’s requirement
      </a>
      <label>
        {condition.operator === 'equals'
          ? 'Does this criterion describe you?'
          : condition.operator === 'oneOf'
            ? `Which listed ${fieldLabel(q.rule.field).toLowerCase()} applies to you?`
            : `Your exact ${q.rule.field}${q.rule.referenceDate ? ` on ${q.rule.referenceDate}` : ''}`}
        {condition.operator === 'equals' ? (
          <select required value={value} onChange={(e) => setValue(e.target.value)}>
            <option value="">Choose</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        ) : condition.operator === 'oneOf' ? (
          <select required value={value} onChange={(e) => setValue(e.target.value)}>
            <option value="">Choose a listed option</option>
            {condition.values.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <input
            required
            maxLength={300}
            type="number"
            min={0}
            max={q.rule.field === 'average' ? 100 : undefined}
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        )}
      </label>
      <button disabled={!value.trim()}>Update results</button>
      {condition.operator === 'oneOf' && (
        <button
          type="button"
          onClick={() =>
            onAnswer({
              state: 'answered',
              fact: {
                kind: 'choices',
                values: [],
                mode: 'actual',
                complete: true,
                ...(q.rule.basis ? { basis: q.rule.basis } : {}),
                ...(q.rule.referenceDate ? { asOf: q.rule.referenceDate } : {}),
              },
            })
          }
        >
          None of these applies to me
        </button>
      )}
      <button type="button" onClick={() => onAnswer({ state: 'not-sure' })}>
        Not sure
      </button>
      <button type="button" onClick={() => onAnswer({ state: 'declined' })}>
        Prefer not to answer
      </button>
      <button type="button" onClick={() => onAnswer({ state: 'not-applicable' })}>
        Not applicable
      </button>
    </form>
  );
}
function OpportunityCard({
  assessment: a,
  opportunity: o,
  evidenceHash,
  catalogueHash,
  compared,
  compareDisabled,
  onCompare,
}: {
  assessment: Assessment;
  opportunity: Opportunity;
  evidenceHash: string;
  catalogueHash: string;
  compared: boolean;
  compareDisabled: boolean;
  onCompare: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState('');
  const [details, setDetails] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState('');
  const evidenceInFlight = useRef(false);
  useEffect(() => {
    const read = () =>
      setSaved((o.kind === 'scholarship' ? getSaved() : getSavedPrograms()).includes(o.publicId));
    read();
    window.addEventListener('storage', read);
    return () => window.removeEventListener('storage', read);
  }, [o.kind, o.publicId]);
  const evidence = async () => {
    if (details || evidenceInFlight.current) return;
    evidenceInFlight.current = true;
    setLoading(true);
    setFailure('');
    try {
      const raw = (await verifiedJSON(
        await fetch(`/matching/evidence/${evidenceHash}.json`),
        evidenceHash
      )) as { version: number; catalogueHash: string; opportunity: Opportunity };
      if (raw.version !== 1 || raw.catalogueHash !== catalogueHash || raw.opportunity.key !== o.key)
        throw new Error('Evidence version changed. Reload the page.');
      setDetails(raw.opportunity);
    } catch {
      setFailure('Evidence could not be loaded or its version changed. Retry or reload this page.');
    } finally {
      evidenceInFlight.current = false;
      setLoading(false);
    }
  };
  return (
    <article className="match-card">
      <div className="match-topline">
        <span>{o.kind}</span>
        <span>{labels[a.eligibility]}</span>
      </div>
      <h3>
        <a href={a.detailPath}>{a.title}</a>
      </h3>
      <p>
        {o.amount || o.stipend || 'Amount not listed'}
        {o.provider && ` · ${o.provider}`}
      </p>
      <p>
        <strong>{a.availability.status.replaceAll('_', ' ')}</strong>
        {a.availability.closesOn &&
          ` · Listed closing date: ${a.availability.closesOn}${!a.availability.verified ? ' (unverified)' : ''}`}
      </p>
      <p>
        {a.availability.nextAction}. {a.availability.note}
      </p>
      <p className="match-reasons">Order: {a.rankingReasons.join(' · ')}.</p>
      <div className="match-actions">
        <a className="match-primary" href={a.detailPath}>
          Review listing & next steps →
        </a>
        <button
          aria-pressed={saved}
          onClick={() => {
            try {
              const result =
                o.kind === 'scholarship' ? toggleSaved(o.publicId) : toggleSavedProgram(o.publicId);
              setSaved(result.includes(o.publicId));
              setMessage('Saved list updated. Application steps and calendar export are in Saved.');
            } catch {
              setMessage('This browser could not persist your saved list.');
            }
          }}
        >
          {saved ? 'Saved' : 'Save'}
        </button>
        <button aria-pressed={compared} disabled={compareDisabled} onClick={onCompare}>
          {compared ? 'Remove comparison' : 'Compare'}
        </button>
      </div>
      {message && (
        <p role="status">
          {message} <a href="/saved/">Open Saved</a>
        </p>
      )}
      <details
        onToggle={(e) => {
          if (e.currentTarget.open) void evidence();
        }}
      >
        <summary>Why this result? Requirements and sources</summary>
        <p>
          {a.scopeReviewed
            ? 'Requirement scope reviewed.'
            : 'The full requirement scope still needs source review.'}
        </p>
        {loading && <p role="status">Loading source evidence…</p>}
        {failure && (
          <p role="alert">
            {failure} <button onClick={() => void evidence()}>Retry evidence</button>
          </p>
        )}
        {a.rules.map((r) => {
          const source = details?.matching.requirements.find((rule) => rule.id === r.id);
          return (
            <section key={r.id}>
              <h4>
                {fieldLabel(r.field)} · {r.state.replaceAll('_', ' ')}
              </h4>
              <p>{r.explanation.replace(r.field, fieldLabel(r.field).toLowerCase())}</p>
              {source && (
                <>
                  <p>
                    Evidence: {source.evidence.status} ·{' '}
                    {source.evidence.verifiedAt ?? 'No verification date'}
                  </p>
                  {source.condition.operator === 'manual' && <p>{source.condition.text}</p>}
                  {source.evidence.excerpt && source.evidence.status === 'reviewed' ? (
                    <blockquote>{source.evidence.excerpt}</blockquote>
                  ) : source.condition.operator !== 'manual' && source.evidence.excerpt ? (
                    <p>Existing listing note: {source.evidence.excerpt}</p>
                  ) : null}
                </>
              )}
              {r.sourceUrl && (
                <a href={r.sourceUrl} target="_blank" rel="noreferrer">
                  Provider source
                </a>
              )}
            </section>
          );
        })}
      </details>
    </article>
  );
}
