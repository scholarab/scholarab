/** Calendar-day arithmetic is independent of the host time zone. The display
 * clock uses Alberta's date represented at local midnight for existing views. */
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Edmonton',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
export function albertaDate(now = new Date()): string {
  return formatter.format(now);
}
export function calendarMs(date: string): number {
  return Date.parse(date + 'T00:00:00Z');
}
let cachedMinute = NaN,
  cachedMidnight = NaN;
export function todayDate(now = new Date()): Date {
  const minute = Math.floor(now.getTime() / 60000);
  // Alberta midnight is on a minute boundary, so this never keeps yesterday
  // across midnight. Avoid thousands of Intl calls per directory keystroke.
  if (minute !== cachedMinute) {
    cachedMinute = minute;
    cachedMidnight = new Date(albertaDate(now) + 'T00:00:00').getTime();
  }
  return new Date(cachedMidnight);
}
export function calendarDaysUntil(deadline: string, now = new Date()): number {
  return Math.round((calendarMs(deadline) - calendarMs(albertaDate(now))) / 86400000);
}
