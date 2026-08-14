// ============================================================
// DATE ENGINE — Deterministic school-day calendar logic
// ============================================================
// Given a school-year start date, a week number, and a day
// number (1-5, Mon-Fri), computes the exact calendar date.
// Weekends AND holidays are always skipped so that Grok / the
// AI never makes a calendar mistake.
// ============================================================

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * Philippine national holidays (SY 2026-2027, inclusive).
 * These are regular/legal non-working days observed nationally.
 * Pass a custom list to `computeDateForWeekDay` to override.
 */
export const DEFAULT_PH_HOLIDAYS: string[] = [
  "2026-01-01", // New Year's Day
  "2026-04-09", // Araw ng Kagitingan
  "2026-04-02", // Maundy Thursday
  "2026-04-03", // Good Friday
  "2026-05-01", // Labor Day
  "2026-06-12", // Independence Day
  "2026-08-21", // Ninoy Aquino Day
  "2026-08-31", // National Heroes Day
  "2026-11-01", // All Saints' Day
  "2026-11-30", // Bonifacio Day
  "2026-12-08", // Feast of the Immaculate Conception
  "2026-12-25", // Christmas Day
  "2026-12-30", // Rizal Day
  "2026-12-31", // Last Day of the Year
];

// ============================================================
// FORMATTING HELPERS
// ============================================================

/** "June 08, 2026" (full month name, zero-padded day) */
export function formatLongDate(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${String(date.getDate()).padStart(2, "0")}, ${date.getFullYear()}`;
}

/** "2026-06-08" (local, not UTC) */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Parse a flexible date input into a Date.
 * Accepts "June 8, 2026", "Jun 8, 2026", "2026-06-08", "06/08/2026".
 * Returns null when unparseable.
 */
export function parseDateInput(value: string): Date | null {
  if (!value) return null;
  const trimmed = value.trim();

  // ISO "2026-06-08"
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return isNaN(date.getTime()) ? null : date;
  }

  // US "06/08/2026"
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (us) {
    const date = new Date(Number(us[3]), Number(us[1]) - 1, Number(us[2]));
    return isNaN(date.getTime()) ? null : date;
  }

  // "June 8, 2026" / "Jun 8, 2026"
  const named = /^([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})$/.exec(trimmed);
  if (named) {
    const monthIndex = MONTHS.findIndex(
      (m) => m.toLowerCase() === named[1].toLowerCase() || m.slice(0, 3).toLowerCase() === named[1].toLowerCase()
    );
    if (monthIndex === -1) return null;
    const date = new Date(Number(named[3]), monthIndex, Number(named[2]));
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}

// ============================================================
// CALENDAR PREDICATES
// ============================================================

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function isHoliday(date: Date, holidays: string[] = DEFAULT_PH_HOLIDAYS): boolean {
  return holidays.includes(toISODate(date));
}

export function isSchoolDay(date: Date, holidays: string[] = DEFAULT_PH_HOLIDAYS): boolean {
  return !isWeekend(date) && !isHoliday(date, holidays);
}

/** Monday of the week containing `date`. */
export function getMonday(date: Date): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (copy.getDay() + 6) % 7; // Mon=0
  copy.setDate(copy.getDate() - offset);
  return copy;
}

// ============================================================
// CORE COMPUTATIONS
// ============================================================

export interface DateEngineResult {
  date: Date;
  formattedDate: string;
  isoDate: string;
  weekNumber: number;
  dayNumber: number;
  weekday: string;
}

/**
 * Compute the exact calendar date for a DBOW row identified by
 * (weekNumber, dayNumber) relative to the school-year start date.
 *
 * Semantics (matches how DBOW week ranges are laid out):
 * - Week 1 begins on the Monday on/before `startDate`.
 * - Day numbers 1-5 map to Monday-Friday of that week, exactly as the
 *   DBOW PDF lists its date ranges (e.g., "July 23-27, 2026").
 * - Weekends are rejected (day 6/7 invalid). Holidays are NOT skipped
 *   here because the DBOW is the source of truth for the school
 *   calendar; use `computeDateForSequentialDay` when a running school-
 *   day counter (Day 1, Day 2, ... Day 50) must skip holidays.
 *
 * Returns null when inputs are invalid (weekNumber < 1, dayNumber < 1
 * or > 5).
 */
export function computeDateForWeekDay(
  startDate: Date,
  weekNumber: number,
  dayNumber: number
): DateEngineResult | null {
  if (!isFinite(weekNumber) || weekNumber < 1) return null;
  if (!isFinite(dayNumber) || dayNumber < 1 || dayNumber > 5) return null;

  const week1Monday = getMonday(startDate);
  const target = new Date(
    week1Monday.getFullYear(),
    week1Monday.getMonth(),
    week1Monday.getDate() + (weekNumber - 1) * 7 + (dayNumber - 1)
  );

  return {
    date: target,
    formattedDate: formatLongDate(target),
    isoDate: toISODate(target),
    weekNumber,
    dayNumber,
    weekday: WEEKDAYS[target.getDay()],
  };
}

/**
 * Compute the sequential school-day number (Day_Number) for a given
 * calendar target date, per the CALENDAR & DBOW MAPPING spec.
 *
 * Logic: total school days = Count(Working Days from Term_Start_Date
 * up to and including Target_Date) - Holidays. Day 1 is the first
 * school day on/after `startDate`; weekends and holidays are always
 * skipped. The result can be matched against the DBOW row [Day_Number].
 *
 * Returns null when inputs are invalid or `targetDate` precedes
 * `startDate` (negative day counts are rejected).
 */
export function computeDayNumberForDate(
  targetDate: Date,
  startDate: Date,
  holidays: string[] = DEFAULT_PH_HOLIDAYS
): DateEngineResult | null {
  if (isNaN(targetDate.getTime()) || isNaN(startDate.getTime())) return null;

  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

  if (target < start) return null;

  const cursor = new Date(start);
  let dayNumber = 0;
  let guard = 0;

  while (cursor <= target && guard < 400) {
    if (isSchoolDay(cursor, holidays)) {
      dayNumber++;
    }
    cursor.setDate(cursor.getDate() + 1);
    guard++;
  }

  return {
    date: target,
    formattedDate: formatLongDate(target),
    isoDate: toISODate(target),
    weekNumber: computeWeekNumber(target, start),
    dayNumber,
    weekday: WEEKDAYS[target.getDay()],
  };
}

/**
 * Compute the calendar date for a running school-day counter.
 * Day 1 = the first SCHOOL day on/after `startDate`; every subsequent
 * day skips weekends and holidays. Useful for the generalized "Day 50"
 * style inputs where the day number is sequential across the term.
 *
 * Returns null when inputs are invalid or the search exceeds safety bounds.
 */
export function computeDateForSequentialDay(
  startDate: Date,
  dayNumber: number,
  holidays: string[] = DEFAULT_PH_HOLIDAYS
): DateEngineResult | null {
  if (!isFinite(dayNumber) || dayNumber < 1) return null;

  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  let found = 0;
  let guard = 0;

  while (guard < 400) {
    if (isSchoolDay(cursor, holidays)) {
      found++;
      if (found === dayNumber) {
        return {
          date: cursor,
          formattedDate: formatLongDate(cursor),
          isoDate: toISODate(cursor),
          weekNumber: computeWeekNumber(cursor, startDate),
          dayNumber,
          weekday: WEEKDAYS[cursor.getDay()],
        };
      }
    }
    cursor.setDate(cursor.getDate() + 1);
    guard++;
  }

  return null;
}

/**
 * Compute the school week number (1-based) for a given calendar date.
 * Week 1 = the week of the Monday on/before `startDate`.
 */
export function computeWeekNumber(date: Date, startDate: Date): number {
  const dateMonday = getMonday(date);
  const startMonday = getMonday(startDate);
  const diffDays = Math.round(
    (dateMonday.getTime() - startMonday.getTime()) / (24 * 60 * 60 * 1000)
  );
  return Math.floor(diffDays / 7) + 1;
}