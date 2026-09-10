import { profileSchema, type Profile } from './types';
import { QUIZ_STORAGE_KEY, QUIZ_TTL_MS } from '../quiz';
export const SESSION_KEY = 'scholarab_matching_v1';
export const TTL = QUIZ_TTL_MS;
export interface MatchSession {
  version: 1;
  catalogueHash: string;
  expiresAt: number;
  intent: string;
  stage: string;
  community: string;
  profile: Profile;
  personal: boolean;
  attempted: string[];
  ready: boolean;
}
export function freshSession(catalogueHash: string, now = Date.now()): MatchSession {
  return {
    version: 1,
    catalogueHash,
    expiresAt: now + TTL,
    intent: '',
    stage: '',
    community: '',
    profile: { answers: {} },
    personal: false,
    attempted: [],
    ready: false,
  };
}
export function readSession(storage: Storage, hash: string, now = Date.now()): MatchSession {
  const fresh = freshSession(hash, now);
  try {
    const raw = storage.getItem(SESSION_KEY);
    if (raw) {
      const s = JSON.parse(raw) as MatchSession;
      if (
        s.version === 1 &&
        s.catalogueHash === hash &&
        s.expiresAt > now &&
        s.expiresAt <= now + TTL &&
        typeof s.intent === 'string' &&
        typeof s.stage === 'string' &&
        typeof s.community === 'string' &&
        s.community.length <= 300 &&
        typeof s.personal === 'boolean' &&
        typeof s.ready === 'boolean' &&
        Array.isArray(s.attempted) &&
        s.attempted.every((k) => typeof k === 'string')
      ) {
        profileSchema.parse(s.profile);
        return s;
      }
      storage.removeItem(SESSION_KEY);
      storage.removeItem(QUIZ_STORAGE_KEY);
      return fresh;
    }
    const old = JSON.parse(storage.getItem(QUIZ_STORAGE_KEY) || 'null');
    storage.removeItem(QUIZ_STORAGE_KEY);
    if (old && Number.isFinite(old.savedAt) && old.savedAt <= now && now - old.savedAt < TTL) {
      // Only exact essentials migrate. Old estimated marks/institution plans
      // are not reinterpreted as measured marks or enrollment.
      fresh.intent = ['both', 'scholarships', 'programs'].includes(old.answers?.searchType)
        ? old.answers.searchType
        : '';
      fresh.stage = ['10', '11', '12', 'post-secondary', 'not-sure'].includes(old.answers?.grade)
        ? old.answers.grade
        : '';
      fresh.community =
        typeof old.answers?.city === 'string' && old.answers.city.length <= 300
          ? old.answers.city
          : '';
      fresh.expiresAt = old.savedAt + TTL;
    }
  } catch {
    /* Storage denial or invalid data must not stop matching. */
  }
  return fresh;
}
export function essentialProfile(s: MatchSession): Profile {
  return {
    answers: {
      ...(s.stage && s.stage !== 'not-sure'
        ? {
            educationStage: {
              state: 'answered' as const,
              fact: {
                kind: 'choices' as const,
                values: [s.stage],
                mode: 'actual' as const,
                complete: true,
                basis: 'current',
              },
            },
          }
        : {}),
      ...(s.community && s.community !== 'not-sure'
        ? {
            residence: {
              state: 'answered' as const,
              fact: {
                kind: 'choices' as const,
                values: [s.community],
                mode: 'actual' as const,
                complete: false,
                basis: 'community',
              },
            },
          }
        : {}),
      ...s.profile.answers,
    },
  };
}
