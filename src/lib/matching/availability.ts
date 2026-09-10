import type { Opportunity } from './normalize';
const clocks = new Map<string, Intl.DateTimeFormat>();
export function dateInZone(now: Date, zone = 'America/Edmonton') {
  let formatter = clocks.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    clocks.set(zone, formatter);
  }
  return formatter.format(now);
}
export function evaluateAvailability(opportunity: Opportunity, now: Date) {
  const a = opportunity.matching.availability;
  const today = dateInZone(now, a.timezone ?? 'America/Edmonton');
  const verified =
    a.evidence.status === 'reviewed' && !!a.evidence.verifiedAt && a.evidence.verifiedAt <= today;
  let status: 'open' | 'opens_later' | 'rolling' | 'deadline_unpublished' | 'unknown' | 'closed';
  if (!opportunity.active) status = 'closed';
  else if (!verified) status = 'unknown';
  else if (a.closesOn && a.closesOn < today) status = 'closed';
  else if (a.opensOn && a.opensOn > today) status = 'opens_later';
  else if (a.timing === 'rolling') status = 'rolling';
  else if (a.closesOn) status = a.opensOn ? 'open' : 'unknown';
  else status = a.timing === 'unpublished' ? 'deadline_unpublished' : 'unknown';
  const method = verified ? a.method : 'unknown';
  const nextAction =
    status === 'closed'
      ? 'Check for a future cycle'
      : status === 'opens_later'
        ? 'Prepare for the opening'
        : method === 'nomination'
          ? 'Check the nomination process'
          : method === 'automatic'
            ? 'Check automatic consideration requirements'
            : (status === 'open' || status === 'rolling') && method === 'application'
              ? 'Review the official application instructions'
              : 'Verify the application window and method';
  return {
    status,
    method,
    verified,
    today,
    opensOn: a.opensOn,
    closesOn: a.closesOn,
    timezone: a.timezone,
    nextAction,
    note: !verified
      ? 'Application dates and method still need source verification.'
      : a.closesOn === today
        ? 'The closing date is today; check the provider’s exact closing time.'
        : status === 'unknown' && a.closesOn
          ? 'A closing date alone does not confirm applications are open.'
          : null,
  };
}
export type Availability = ReturnType<typeof evaluateAvailability>;
