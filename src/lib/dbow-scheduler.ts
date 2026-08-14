// ============================================================
// DBOW DATE ALLOCATION ENGINE
// ============================================================
// Generates precise, non-conflicting target dates for a Definitive
// Budget of Work (DBOW) from a Master Calendar + subject syllabus.
//
// Rules implemented:
//  1. Strict Master Calendar adherence — never schedule during
//     holidays, suspensions, in-service days, or exam weeks.
//  2. Instructional Day Logic — Mon-Fri only; each DBOW week spans
//     `teachingFrequency` actual class days; if a holiday falls on a
//     weekday the week's end date extends to cover the required hours
//     (competencies are never skipped).
//  3. Term & Phase Boundaries — no overlapping dates between terms;
//     Week 1 of a term begins on/after that term's official start
//     date; exam & evaluation windows are reserved for assessment.
// ============================================================

import { parseDateInput, toISODate, isWeekend } from "@/lib/date-engine";

export interface HolidayEntry {
  date: string; // ISO yyyy-mm-dd
  name?: string;
}

export interface DateWindow {
  start: string; // ISO yyyy-mm-dd
  end: string; // ISO yyyy-mm-dd
}

export interface TermSpec {
  name: string;
  startDate: string; // ISO yyyy-mm-dd
  endDate: string; // ISO yyyy-mm-dd
  /** Exam & evaluation windows reserved strictly for assessment. */
  examWindows?: DateWindow[];
}

export interface SchedulerInput {
  /** Display name for the learning area / subject. */
  learningArea?: string;
  /** Standard teaching days per week (e.g., 5 = Mon-Fri). */
  teachingFrequency: number;
  /** Official list of holidays, suspensions, and non-working days. */
  holidays?: HolidayEntry[];
  /** One entry per Term/Quarter with start/end + exam windows. */
  terms: TermSpec[];
  /** Ordered competency/module titles; assigned week-by-week. */
  syllabus: string[];
}

export interface ScheduleRow {
  term: string;
  weekNumber: number;
  competency: string;
  startDate: string; // MM/DD/YYYY
  endDate: string; // MM/DD/YYYY
  teachingDays: number;
  notes: string;
}

export interface SchedulerResult {
  rows: ScheduleRow[];
  warnings: string[];
}

/** Format a Date as a readable label, e.g. "November 03, 2026". */
export function formatMMDDYYYY(date: Date): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[date.getMonth()]} ${String(date.getDate()).padStart(2, "0")}, ${date.getFullYear()}`;
}

/** True when `date` (midnight) is inside [start, end] inclusive. */
function isInAnyWindow(date: Date, windows?: DateWindow[]): boolean {
  if (!windows || windows.length === 0) return false;
  const target = date.getTime();
  return windows.some((w) => {
    const s = parseDateInput(w.start);
    const e = parseDateInput(w.end);
    if (!s || !e) return false;
    return target >= s.getTime() && target <= e.getTime();
  });
}

/** Validate that all required information was supplied. */
export function validateSchedulerInput(input: SchedulerInput): string[] {
  const errors: string[] = [];
  if (!input.terms || input.terms.length === 0) {
    errors.push("Start and End dates for at least one Term/Quarter are required.");
  }
  if (
    typeof input.teachingFrequency !== "number" ||
    !isFinite(input.teachingFrequency) ||
    input.teachingFrequency < 1
  ) {
    errors.push("Teaching frequency (days per week) is required and must be at least 1.");
  }
  if (!input.holidays || input.holidays.length === 0) {
    errors.push("The official list of holidays, suspensions, and non-working days is required.");
  }
  if (!input.syllabus || input.syllabus.length === 0) {
    errors.push("The syllabus/topics list is required.");
  }
  return errors;
}

/**
 * Compute the DBOW date schedule.
 *
 * Each term is processed independently within its [startDate, endDate]
 * bounds. School days are the weekdays inside the term that are neither
 * holidays nor exam-window dates. Consecutive school days are chunked
 * into DBOW weeks of `teachingFrequency` days each; because holidays are
 * simply excluded from the count, a week's end date naturally extends
 * when a holiday falls mid-week.
 */
export function scheduleDBOW(input: SchedulerInput): SchedulerResult {
  const warnings: string[] = [];
  const rows: ScheduleRow[] = [];

  const frequency = Math.max(1, Math.floor(input.teachingFrequency || 5));
  const holidaySet = new Set((input.holidays || []).map((h) => h.date));
  const holidayName = new Map((input.holidays || []).map((h) => [h.date, h.name]));

  let syllabusIndex = 0;

  for (const term of input.terms) {
    const termStart = parseDateInput(term.startDate);
    const termEnd = parseDateInput(term.endDate);

    if (!termStart || !termEnd) {
      warnings.push(`${term.name}: invalid start/end date, skipped.`);
      continue;
    }
    if (termEnd < termStart) {
      warnings.push(`${term.name}: end date precedes start date, skipped.`);
      continue;
    }

    // Collect school days within the term, skipping weekends, holidays,
    // and exam windows.
    const schoolDays: Date[] = [];
    const cursor = new Date(termStart.getFullYear(), termStart.getMonth(), termStart.getDate());
    const end = new Date(termEnd.getFullYear(), termEnd.getMonth(), termEnd.getDate());

    let guard = 0;
    while (cursor <= end && guard < 1000) {
      if (!isWeekend(cursor)) {
        const iso = toISODate(cursor);
        if (!holidaySet.has(iso) && !isInAnyWindow(cursor, term.examWindows)) {
          schoolDays.push(new Date(cursor));
        }
      }
      cursor.setDate(cursor.getDate() + 1);
      guard++;
    }

    // Chunk school days into DBOW weeks.
    let weekNumber = 1;
    for (let i = 0; i < schoolDays.length; i += frequency) {
      const chunk = schoolDays.slice(i, i + frequency);
      const start = chunk[0];
      const endDate = chunk[chunk.length - 1];

      // Gather exclusions that fall within this week's span.
      const exclusions: string[] = [];
      const cursor2 = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const end2 = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      let guard2 = 0;
      while (cursor2 <= end2 && guard2 < 100) {
        const iso = toISODate(cursor2);
        if (holidaySet.has(iso)) {
          exclusions.push(holidayName.get(iso) || iso);
        } else if (isInAnyWindow(cursor2, term.examWindows)) {
          exclusions.push("Exam/Evaluation window");
        }
        cursor2.setDate(cursor2.getDate() + 1);
        guard2++;
      }

      const competency =
        syllabusIndex < input.syllabus.length
          ? input.syllabus[syllabusIndex]
          : `[Competency ${syllabusIndex + 1}]`;
      syllabusIndex++;

      rows.push({
        term: term.name,
        weekNumber,
        competency,
        startDate: formatMMDDYYYY(start),
        endDate: formatMMDDYYYY(endDate),
        teachingDays: chunk.length,
        notes:
          exclusions.length > 0
            ? `Excludes ${exclusions.join(", ")}`
            : "No exclusions",
      });
      weekNumber++;
    }

    if (weekNumber === 1) {
      warnings.push(
        `${term.name}: no instructional days available (all dates are holidays, weekends, or exam windows).`
      );
    }
  }

  // Report unused syllabus items so the user knows the term windows
  // were too short for the full curriculum.
  if (syllabusIndex < input.syllabus.length) {
    warnings.push(
      `${input.syllabus.length - syllabusIndex} topic(s) could not be scheduled — extend term windows or reduce the syllabus.`
    );
  }

  return { rows, warnings };
}
