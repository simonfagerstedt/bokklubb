/**
 * The meetup date poll (tables meetup_dates and meetup_date_votes): helpers
 * shared by the page and the Server Actions.
 */

export type MeetupDate = {
  id: string;
  /** "YYYY-MM-DD" */
  meet_on: string;
  suggested_by: string | null;
};
export type MeetupDateVote = { meetup_date_id: string; member_id: string };

/** Today's date in Sweden, as "YYYY-MM-DD". */
export function todayInSweden(): string {
  // sv-SE formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
  }).format(new Date());
}

/**
 * "Friday 14 November" ("Fri 14 Nov" when short), plus the year when it
 * isn't this year.
 */
export function formatMeetDate(isoDate: string, short = false): string {
  const date = new Date(`${isoDate}T12:00:00Z`);
  const sameYear = isoDate.slice(0, 4) === todayInSweden().slice(0, 4);
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...options }).format(date);
  // Weekday and date formatted apart: together, en-GB adds a comma
  // ("Tuesday, 25 May 2027") whenever the year is included.
  const style = short ? "short" : "long";
  return `${format({ weekday: style })} ${format({
    day: "numeric",
    month: style,
    ...(sameYear ? {} : { year: "numeric" }),
  })}`;
}

/** Member ids that voted for each suggested date, by date id. */
export function votersByDate(votes: MeetupDateVote[]) {
  const byDate = new Map<string, string[]>();
  for (const v of votes) {
    const list = byDate.get(v.meetup_date_id) ?? [];
    list.push(v.member_id);
    byDate.set(v.meetup_date_id, list);
  }
  return byDate;
}

/**
 * The suggested dates with the most votes ("YYYY-MM-DD", earliest first).
 * One entry is a clear winner; several is a tie; none means no poll.
 */
export function leadingDates(
  dates: MeetupDate[],
  votes: MeetupDateVote[],
): string[] {
  const voters = votersByDate(votes);
  const count = (d: MeetupDate) => voters.get(d.id)?.length ?? 0;
  const most = Math.max(0, ...dates.map(count));
  return dates
    .filter((d) => count(d) === most)
    .map((d) => d.meet_on)
    .sort();
}

/** Accepts only a real calendar date written "YYYY-MM-DD". */
export function parseIsoDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const date = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  // Rejects e.g. 2026-02-31, which Date quietly rolls over to March.
  return date.toISOString().slice(0, 10) === trimmed ? trimmed : null;
}
