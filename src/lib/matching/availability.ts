import type { Opportunity } from './normalize';
import { scholarshipStatusOf, programStatusOf } from '../status';
import { evidenceIsUsable } from './evidence';
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
  const verified = evidenceIsUsable(a.evidence, today);
  // Status functions compare calendar dates at midnight. Use the provider's
  // calendar day so a deadline remains current through that entire day.
  const calendarDay = new Date(`${today}T00:00:00`);
  const listingStatus =
    opportunity.kind === 'scholarship'
      ? scholarshipStatusOf(
          {
            active: opportunity.active,
            openDate: opportunity.legacyOpenDate,
            deadline: opportunity.legacyDeadline,
          },
          calendarDay
        )
      : opportunity.active === false
        ? 'closed'
        : programStatusOf({ deadline: opportunity.legacyDeadline }, calendarDay);
  // The shared listing policy controls closed/future states. Reviewed dates
  // can narrow the window but a listing's "active" flag cannot prove it open.
  const windowStatus = scholarshipStatusOf(
    { openDate: verified ? a.opensOn : null, deadline: verified ? a.closesOn : null },
    calendarDay
  );
  let status: 'open' | 'opens_later' | 'rolling' | 'deadline_unpublished' | 'unknown' | 'closed';
  if (listingStatus === 'closed') status = 'closed';
  else if (listingStatus === 'future') status = 'opens_later';
  else if (!verified) status = 'unknown';
  else if (windowStatus === 'closed') status = 'closed';
  else if (windowStatus === 'future') status = 'opens_later';
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
    note: listingStatus === 'future' && !opportunity.legacyOpenDate
      ? 'This listing is between cycles; the next opening date is not confirmed.'
      : !verified
      ? 'Application dates and method still need source verification.'
      : a.closesOn === today
        ? 'The closing date is today; check the provider’s exact closing time.'
        : status === 'unknown' && a.closesOn
          ? 'A closing date alone does not confirm applications are open.'
          : null,
  };
}
export type Availability = ReturnType<typeof evaluateAvailability>;
