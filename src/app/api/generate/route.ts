import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateLessonPlan, generateFromPayload } from "@/lib/gemini";
import { buildSystemPrompt, buildUserPrompt, buildWLPSystemPrompt, buildWLPUserPrompt, ILAW_JSON_OUTPUT_CONTRACT } from "@/lib/prompts";
import { buildDynamicSystemPrompt, buildGrokPayload, buildUserInstruction, matchDBOWRowByDayNumber } from "@/lib/grok-payload";
import { computeDateForSequentialDay, computeDayNumberForDate, parseDateInput, formatLongDate } from "@/lib/date-engine";
import type { DateEngineResult } from "@/lib/date-engine";
import { loadTemplatesMeta, extractTemplateStructure, TEMPLATES_DIR } from "@/lib/template-processor";
import path from "path";
import fs from "fs/promises";
import type { LessonPlanInput, GeneratedLessonPlan, GeneratedDLPPlan, WeeklyLessonPlan, PlanType, DBOWEntryPayload } from "@/types/lesson-plan";

function parseWeekNumber(weekRange?: string): number | null {
  if (!weekRange) return null;
  const match = weekRange.match(/Week\s+(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

function parseDayNumber(day?: string): number | null {
  if (!day) return null;
  const match = day.match(/Day\s+(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

function normalizeJSON(rawResponse: string): string {
  let cleaned = rawResponse.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

/**
 * Flatten a structured daily-activities object into a readable text block.
 * Handles shapes the AI sometimes returns instead of the promised string,
 * e.g. { opening, activity1, activity2, activity3, closing }.
 */
function flattenActivities(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => flattenActivities(item))
      .filter(Boolean)
      .join("\n");
  }
  if (typeof value === "object") {
    const keys: string[] = [];
    const collect = (obj: Record<string, unknown>, depth: number) => {
      for (const [key, val] of Object.entries(obj)) {
        if (val == null) continue;
        if (typeof val === "string") {
          keys.push(`• ${key}: ${val.trim()}`);
        } else if (typeof val === "object") {
          if (depth < 2) collect(val as Record<string, unknown>, depth + 1);
        } else {
          keys.push(`• ${key}: ${String(val)}`);
        }
      }
    };
    collect(value as Record<string, unknown>, 0);
    return keys.join("\n");
  }
  return "";
}

/**
 * Normalize a raw WLP response so every day is a DayPlan with a string
 * `activities` field. The AI occasionally returns each day as a structured
 * object (opening/activity1/activity2/activity3/closing) either wrapped in
 * {day, date, activities} or as the bare day object itself.
 */
function normalizeWeeklyPlan(raw: Record<string, unknown> | null | undefined): WeeklyLessonPlan {
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday"] as const;

  const plan: WeeklyLessonPlan = {
    monday: { day: "Monday", date: "", activities: "" },
    tuesday: { day: "Tuesday", date: "", activities: "" },
    wednesday: { day: "Wednesday", date: "", activities: "" },
    thursday: { day: "Thursday", date: "", activities: "" },
    friday: { day: "Friday", date: "", activities: "" },
    weeklyObjectives: "",
    weeklyCompetencies: "",
    weeklyContent: "",
    learningResources: "",
    remarks: "",
    reflection: "",
  };

  if (raw && typeof raw === "object") {
    for (const key of Object.keys(raw)) {
      if (key in plan) {
        const value = raw[key];
        const textKeys: string[] = ["weeklyObjectives", "weeklyCompetencies", "weeklyContent", "learningResources", "remarks", "reflection"];
        (plan as unknown as Record<string, unknown>)[key] =
          textKeys.includes(key) ? flattenActivities(value) : value;
      }
    }

    for (const day of days) {
      const rawDay = raw?.[day] as Record<string, unknown> | undefined;
      if (!rawDay || typeof rawDay !== "object") continue;

      // Wrapped shape: { day, date, activities }
      if (typeof rawDay.activities === "string") {
        plan[day] = {
          day: typeof rawDay.day === "string" ? rawDay.day : day,
          date: typeof rawDay.date === "string" ? rawDay.date : "",
          activities: rawDay.activities,
        };
        continue;
      }

      // Bare shape: { opening, activity1, ... } or { activities: {...} }
      const activitiesValue = rawDay.activities ?? rawDay;
      plan[day] = {
        day: typeof rawDay.day === "string" ? rawDay.day : day,
        date: typeof rawDay.date === "string" ? rawDay.date : "",
        activities: flattenActivities(activitiesValue),
      };
    }
  }

  return plan;
}

/**
 * DBOW mapping uses pure Mon–Fri weeks from the term start (no national
 * holiday subtraction) because the DBOW is the source of truth for the
 * school calendar. This keeps the spec example intact: Aug 14, 2026 → Day 50.
 */
const DBOW_MAPPING_HOLIDAYS: string[] = [];

/**
 * Term-aware reference dates (mirror of the form / scheduler defaults).
 * The DBOW restarts the sequential Day_Number at 1 each term, so the
 * counter must be anchored to that term's official start date.
 */
const TERM_REFERENCE_DATES: Record<string, Date> = {
  First: new Date(2026, 5, 8), // June 8, 2026 (Term 1)
  Second: new Date(2026, 10, 3), // Nov 3, 2026 (Term 2)
  Third: new Date(2027, 2, 15), // Mar 15, 2027 (Term 3)
};

/**
 * Resolve the term-aware reference date for a DBOW entry: uses the term's
 * official start date (First/Second/Third), falling back to `startDate` when
 * the term cannot be determined.
 */
function resolveTermReferenceDate(
  dbowEntry: LessonPlanInput["dbowEntry"],
  startDate?: string
): Date | null {
  const termMatch = (dbowEntry?.term || "").match(/(First|Second|Third)\s+Term/i);
  if (termMatch) {
    const termName =
      termMatch[1].charAt(0).toUpperCase() + termMatch[1].slice(1).toLowerCase();
    const termDate = TERM_REFERENCE_DATES[termName];
    if (termDate) return termDate;
  }
  return parseDateInput(startDate || "June 8, 2026");
}

/**
 * Resolve the deterministic calendar date for a lesson input.
 *
 * Per the spec, the DBOW Day_Number is a sequential school-day counter
 * (Day 1 = first Mon–Fri school day of the term). We resolve the calendar
 * date deterministically from the Day_Number, and vice-versa, so the AI
 * never makes a calendar mistake.
 */
function resolveDBOWDate(input: LessonPlanInput): {
  targetDate: string;
  targetWeek: string;
  dayLabel: string;
  derivedDate: DateEngineResult | null;
  resolvedRow: DBOWEntryPayload | null;
} {
  const { dbowEntry, dbowEntries, startDate } = input;

  let targetDate = dbowEntry?.specificDate || dbowEntry?.date || input.calendarDate || "";
  let targetWeek = input.week || "";

  const start = resolveTermReferenceDate(dbowEntry, startDate);

  // The DBOW row's sequential Day_Number (e.g., "50" for "Day 50")
  const dbowDayNumber = parseDayNumber(dbowEntry?.day || dbowEntry?.dayNumber);

  // Case A: DBOW row provides a sequential Day_Number -> derive exact date.
  const dateFromCounter = start && dbowDayNumber
    ? computeDateForSequentialDay(start, dbowDayNumber, DBOW_MAPPING_HOLIDAYS)
    : null;

  // Case B: A Target_Date is provided -> derive the sequential Day_Number,
  // then match it against the parsed DBOW rows.
  let dayCounterResult = null as DateEngineResult | null;
  const targetDateParsed = parseDateInput(targetDate);
  if (start && targetDateParsed) {
    dayCounterResult = computeDayNumberForDate(targetDateParsed, start, DBOW_MAPPING_HOLIDAYS);
  }

  let derivedDate: DateEngineResult | null = null;
  if (dateFromCounter) {
    derivedDate = dateFromCounter;
    if (!targetDate) targetDate = dateFromCounter.formattedDate;
  } else if (dayCounterResult) {
    derivedDate = dayCounterResult;
    targetDate = dayCounterResult.formattedDate;
  }

  if (derivedDate) {
    targetWeek = `Week ${derivedDate.weekNumber}`;
  } else {
    const weekFromRange = parseWeekNumber(dbowEntry?.weekRange);
    if (weekFromRange) targetWeek = `Week ${weekFromRange}`;
  }

  let dayLabel = dbowEntry?.day || input.dayNumber || (dayCounterResult ? `Day ${dayCounterResult.dayNumber}` : "Day 1");

  // ---- 1.5 DBOW ROW RESOLUTION ----
  // If a Target_Date was supplied but no specific DBOW row was picked, match the
  // Date Engine's Day_Number against the parsed DBOW rows and inject that row.
  let resolvedRow: DBOWEntryPayload | null = dbowEntry ?? null;
  if (!resolvedRow && dbowEntries && dbowEntries.length > 0) {
    const matchDayNumber = dayCounterResult?.dayNumber || dbowDayNumber || 0;
    if (matchDayNumber > 0) {
      resolvedRow = matchDBOWRowByDayNumber(dbowEntries, matchDayNumber);
      if (resolvedRow) {
        dayLabel = resolvedRow.day || dayLabel;
        if (!targetWeek) targetWeek = resolvedRow.weekRange || targetWeek;
      }
    }
  }

  return { targetDate, targetWeek, dayLabel, derivedDate, resolvedRow };
}

/**
 * Generalized pipeline (Date Engine + Dynamic Grok prompt + uploaded template layout).
 * Used when the user has selected a DBOW entry AND a .docx template.
 */
async function handleGeneralized(input: LessonPlanInput, userId: string) {
  const { templateId } = input;
  const { targetDate, targetWeek, dayLabel, derivedDate, resolvedRow } = resolveDBOWDate(input);

  // ---- 1. FILE PARSER: extract template structure & placeholders ----
  let templateStructure = "(no template structure provided — use a standard DepEd DLP layout)";
  if (templateId) {
    const templates = await loadTemplatesMeta();
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      const templateFilePath = path.join(TEMPLATES_DIR, template.filename);
      try {
        const buffer = await fs.readFile(templateFilePath);
        templateStructure = await extractTemplateStructure(buffer);
      } catch {
        // fall back to default structure
      }
    }
  }

  // ---- 3. GROK API PAYLOAD GENERATOR ----
  const payloadData = {
    calculatedDate: targetDate,
    calculatedWeek: targetWeek,
    dayNumber: dayLabel,
    teacherName: input.teacherName || "[Teacher Name]",
    gradeAndSection: `${input.gradeLevel} – ${input.subjectDescription || "Section"}`,
    schoolDivision: input.schoolName || "SDO LAS PIÑAS CITY",
    subjectGrade: `${input.learningArea} ${input.gradeLevel}`,
    contentDomain: resolvedRow?.contentArea || input.subjectDescription || "",
    contentStandard: resolvedRow?.contentStandard || "",
    performanceStandard: resolvedRow?.performanceStandard || "",
    learningCompetency: resolvedRow?.competency || input.competencies || "",
    dailyObjective: resolvedRow?.objective || "",
    suggestedActivity: resolvedRow?.suggestedActivity || resolvedRow?.objective || "",
    extractedTemplateStructure: templateStructure,
  };

  const systemPrompt =
    buildDynamicSystemPrompt(payloadData) + ILAW_JSON_OUTPUT_CONTRACT;
  const userContent =
    `${buildUserInstruction(dayLabel)}\n\n` +
    `DBOW Context:\n${(dbowRawTextForPrompt(input)).substring(0, 4000)}`;

  const payload = buildGrokPayload(payloadData, userContent, { systemPrompt });
  const rawResponse = await generateFromPayload(payload, userId);
  const parsed = JSON.parse(normalizeJSON(rawResponse));

  if (!parsed.header || !parsed.lesson_plan_meta || !parsed.intentions) {
    return NextResponse.json(
      { error: "Invalid DLP response structure from AI" },
      { status: 500 }
    );
  }

  const dlpPlan: GeneratedDLPPlan = parsed;

  // Override AI-computed dates with the Date Engine's deterministic values
  if (derivedDate) {
    dlpPlan.lesson_plan_meta.calendar_date = derivedDate.formattedDate;
    dlpPlan.lesson_plan_meta.week_number = `Week ${derivedDate.weekNumber}`;
    dlpPlan.lesson_plan_meta.day_number = resolvedRow?.day || `Day ${derivedDate.dayNumber}`;
  }

  if (!dlpPlan.learning_experience.flow) {
    dlpPlan.learning_experience.flow = {
      engage: dlpPlan.learning_experience.engage || "",
      explore_explain_modeling: dlpPlan.learning_experience.explore_explain_modeling || "",
      elaborate_guided_practice: dlpPlan.learning_experience.elaborate_guided_practice || "",
      evaluate_independent_practice: dlpPlan.learning_experience.evaluate_independent_practice || "",
      reflection_closure: dlpPlan.learning_experience.reflection_closure || "",
    };
  }
  if (!dlpPlan.assessment.formative_assessment) {
    dlpPlan.assessment.formative_assessment = {
      frustration: dlpPlan.assessment.formative_assessment_frustration || "",
      instructional: dlpPlan.assessment.formative_assessment_instructional || "",
      independent: dlpPlan.assessment.formative_assessment_independent || "",
    };
  }
  if (!dlpPlan.ways_forward.extended_learning) {
    dlpPlan.ways_forward.extended_learning = {
      advanced: dlpPlan.ways_forward.extended_learning_advanced || "",
      struggling: dlpPlan.ways_forward.extended_learning_struggling || "",
    };
  }
  // Ensure reflections are always populated — the AI sometimes omits them
  // or returns them under a differently-cased key.
  dlpPlan.ways_forward.reflections =
    dlpPlan.ways_forward.reflections ||
    ((dlpPlan.ways_forward as unknown as Record<string, unknown>).reflection?.toString() as string | undefined) ||
    DEFAULT_REFLEXIONS;

  return NextResponse.json({ lessonPlan: dlpPlan, planType: "dlp" });
}

const DEFAULT_REFLEXIONS = `For the next session, I will allot more time to the guided practice phase so that learners at the Frustration Level can complete the scaffolded tasks with sufficient support. The learners showed strong interest in exploring real-world applications of today's concept in their own homes, so I plan to start the next session with a brief sharing of their home observations. I would like to share with my co-teachers and school leaders how the differentiated group activities effectively engaged learners at all reading levels, and I hope my instructional coach can help me refine my questioning strategies to deepen HOTS responses from the Independent Level group.`;

function dbowRawTextForPrompt(input: LessonPlanInput): string {
  if (input.dbowRawText) return input.dbowRawText;
  return input.competencies || "";
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const input: LessonPlanInput = await request.json();

    // Validate required fields
    if (!input.gradeLevel || !input.learningArea || !input.quarter || !input.week) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generalized path: DBOW entry + uploaded template + start date
    if (input.dbowEntry && input.templateId) {
      return handleGeneralized(input, user.id);
    }

    const planType: PlanType = input.planType || "dlp";

    let systemPrompt: string;
    let userPrompt: string;

    if (planType === "wlp") {
      systemPrompt = buildWLPSystemPrompt(
        input.curriculumType,
        input.teachingMethod,
        input.teachingMethodCustom
      );
      userPrompt = buildWLPUserPrompt({
        gradeLevel: input.gradeLevel,
        learningArea: input.learningArea,
        quarter: input.quarter,
        week: input.week,
        subjectDescription: input.subjectDescription,
        competencies: input.competencies,
        coiTags: input.coiTags,
        weekDates: input.weekDates,
      });
    } else {
      systemPrompt = buildSystemPrompt(
        input.curriculumType,
        input.teachingMethod,
        input.teachingMethodCustom
      );
      userPrompt = buildUserPrompt({
        gradeLevel: input.gradeLevel,
        learningArea: input.learningArea,
        quarter: input.quarter,
        week: input.week,
        subjectDescription: input.subjectDescription,
        competencies: input.competencies,
        coiTags: input.coiTags,
        teacherName: input.teacherName,
        schoolName: input.schoolName,
        dayNumber: input.dayNumber,
        calendarDate: input.calendarDate,
      });
    }

    const rawResponse = await generateLessonPlan(systemPrompt, userPrompt, user.id);

    // Parse JSON response - strip markdown code fences if present
    const cleanedResponse = normalizeJSON(rawResponse);

    if (planType === "wlp") {
      const weeklyPlan: WeeklyLessonPlan = normalizeWeeklyPlan(JSON.parse(cleanedResponse));

      if (
        !weeklyPlan.monday ||
        !weeklyPlan.tuesday ||
        !weeklyPlan.wednesday ||
        !weeklyPlan.thursday ||
        !weeklyPlan.friday ||
        !weeklyPlan.weeklyObjectives
      ) {
        return NextResponse.json(
          { error: "Invalid WLP response structure from AI" },
          { status: 500 }
        );
      }

      // Deterministic date override: inject the official week dates (if
      // provided) so the AI's invented dates are corrected.
      const wd = input.weekDates;
      const dayMap: { key: "monday" | "tuesday" | "wednesday" | "thursday" | "friday"; slot: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" }[] = [
        { key: "monday", slot: "monday" },
        { key: "tuesday", slot: "tuesday" },
        { key: "wednesday", slot: "wednesday" },
        { key: "thursday", slot: "thursday" },
        { key: "friday", slot: "friday" },
      ];
      if (wd) {
        for (const { key, slot } of dayMap) {
          const dateStr = wd[key];
          if (!dateStr) continue;
          const parsedDate = parseDateInput(dateStr);
          if (parsedDate) {
            weeklyPlan[slot].date = formatLongDate(parsedDate);
          }
        }
      }

      return NextResponse.json({ lessonPlan: weeklyPlan, planType: "wlp" });
    } else {
      const parsed = JSON.parse(cleanedResponse);

      // Check if it's the new ILAW format (has header, lesson_plan_meta, intentions)
      if (parsed.header && parsed.lesson_plan_meta && parsed.intentions) {
        const dlpPlan: GeneratedDLPPlan = parsed;

        // Deterministic date override: always apply the Date Engine so the AI's
        // date is corrected even on the fallback path (no uploaded template).
        const { derivedDate, resolvedRow } = resolveDBOWDate(input);
        if (derivedDate) {
          dlpPlan.lesson_plan_meta.calendar_date = derivedDate.formattedDate;
          dlpPlan.lesson_plan_meta.week_number = `Week ${derivedDate.weekNumber}`;
          dlpPlan.lesson_plan_meta.day_number = resolvedRow?.day || `Day ${derivedDate.dayNumber}`;
        }

        if (
          !dlpPlan.header ||
          !dlpPlan.lesson_plan_meta ||
          !dlpPlan.intentions ||
          !dlpPlan.learning_experience ||
          !dlpPlan.assessment ||
          !dlpPlan.ways_forward ||
          !dlpPlan.signatories
        ) {
          return NextResponse.json(
            { error: "Invalid DLP response structure from AI" },
            { status: 500 }
          );
        }

        // Normalize: ensure nested flow object exists
        if (!dlpPlan.learning_experience.flow) {
          dlpPlan.learning_experience.flow = {
            engage: dlpPlan.learning_experience.engage || "",
            explore_explain_modeling: dlpPlan.learning_experience.explore_explain_modeling || "",
            elaborate_guided_practice: dlpPlan.learning_experience.elaborate_guided_practice || "",
            evaluate_independent_practice: dlpPlan.learning_experience.evaluate_independent_practice || "",
            reflection_closure: dlpPlan.learning_experience.reflection_closure || "",
          };
        }

        // Normalize: ensure nested formative_assessment object exists
        if (!dlpPlan.assessment.formative_assessment) {
          dlpPlan.assessment.formative_assessment = {
            frustration: dlpPlan.assessment.formative_assessment_frustration || "",
            instructional: dlpPlan.assessment.formative_assessment_instructional || "",
            independent: dlpPlan.assessment.formative_assessment_independent || "",
          };
        }

        // Normalize: ensure nested extended_learning object exists
        if (!dlpPlan.ways_forward.extended_learning) {
          dlpPlan.ways_forward.extended_learning = {
            advanced: dlpPlan.ways_forward.extended_learning_advanced || "",
            struggling: dlpPlan.ways_forward.extended_learning_struggling || "",
          };
        }

        // Ensure reflections are always populated
        dlpPlan.ways_forward.reflections =
          dlpPlan.ways_forward.reflections ||
          ((dlpPlan.ways_forward as unknown as Record<string, unknown>).reflection?.toString() as string | undefined) ||
          DEFAULT_REFLEXIONS;

        return NextResponse.json({ lessonPlan: dlpPlan, planType: "dlp" });
      }

      // Fallback: check for old format
      const lessonPlan: GeneratedLessonPlan = parsed;

      if (
        !lessonPlan.objectives ||
        !lessonPlan.content ||
        !lessonPlan.learning_resources ||
        !lessonPlan.procedures ||
        !lessonPlan.remarks ||
        !lessonPlan.reflection
      ) {
        return NextResponse.json(
          { error: "Invalid DLP response structure from AI" },
          { status: 500 }
        );
      }

      return NextResponse.json({ lessonPlan, planType: "dlp" });
    }
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate lesson plan" },
      { status: 500 }
    );
  }
}
