"use client";

import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft, ArrowRight } from "lucide-react";
import { DBOWUpload } from "@/components/DBOWUpload";
import { TemplateUpload } from "@/components/TemplateUpload";
import { Loader } from "@/components/Loader";
import type { DBOWEntry, DBOWData, DBOWMetadata } from "@/components/DBOWUpload";
import type { TemplateMeta } from "@/lib/template-processor";
import { computeDateForSequentialDay, computeDayNumberForDate, parseDateInput, formatLongDate, toISODate } from "@/lib/date-engine";
import type { LessonPlanInput, GeneratedLessonPlan, GeneratedDLPPlan, WeeklyLessonPlan, PlanType, WeekDates } from "@/types/lesson-plan";

const GRADE_LEVELS = Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`);
const QUARTERS = ["Quarter 1", "Quarter 2", "Quarter 3", "Quarter 4"];
const WEEKS = Array.from({ length: 10 }, (_, i) => `Week ${i + 1}`);
const LEARNING_AREAS = [
  "English",
  "Filipino",
  "Mathematics",
  "Science",
  "Araling Panlipunan",
  "Edukasyon sa Pagpapakatao",
  "Music",
  "Arts",
  "Physical Education",
  "Health",
  "Technology and Livelihood Education (TLE)",
  "MAPEH",
];

interface LessonPlanFormProps {
  onGenerated: (plan: GeneratedLessonPlan | GeneratedDLPPlan | WeeklyLessonPlan, input: LessonPlanInput) => void;
  onTemplateSelect?: (template: TemplateMeta | null) => void;
}

const TEACHER_NAME_KEY = "teacher-name-cached";

function loadCachedTeacherName(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(TEACHER_NAME_KEY) || "";
  } catch {
    return "";
  }
}

function saveCachedTeacherName(name: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TEACHER_NAME_KEY, name);
  } catch {
    // localStorage may be unavailable; persistence is a nice-to-have
  }
}

const SCHOOL_NAME_KEY = "school-name-cached";

function loadCachedSchoolName(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(SCHOOL_NAME_KEY) || "";
  } catch {
    return "";
  }
}

function saveCachedSchoolName(name: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SCHOOL_NAME_KEY, name);
  } catch {
    // localStorage may be unavailable; persistence is a nice-to-have
  }
}

const SECTION_KEY = "default_section";

function loadCachedSection(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(SECTION_KEY) || "";
  } catch {
    return "";
  }
}

function saveCachedSection(section: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SECTION_KEY, section);
  } catch {
    // localStorage may be unavailable; persistence is a nice-to-have
  }
}
const STEPS = [
  { title: "Plan Type", description: "DLP or WLP" },
  { title: "Topic", description: "Choose from DBOW" },
  { title: "Lesson Information", description: "Details of the lesson" },
] as const;

/** Show a stored ISO date ("2026-11-03") as a readable label ("November 03, 2026"). */
const isoToReadable = (iso: string): string => {
  const d = parseDateInput(iso);
  return d ? formatLongDate(d) : "";
};

/** Parse an editable readable date ("November 03, 2026") back into ISO storage. */
const readableToIso = (txt: string): string => {
  const d = parseDateInput(txt);
  return d ? toISODate(d) : txt;
};

export function LessonPlanForm({ onGenerated, onTemplateSelect }: LessonPlanFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDBOW, setSelectedDBOW] = useState<DBOWEntry | null>(null);
  const [selectedWeekEntries, setSelectedWeekEntries] = useState<DBOWEntry[]>([]);
  const [weekDates, setWeekDates] = useState<WeekDates>({
    monday: "",
    tuesday: "",
    wednesday: "",
    thursday: "",
    friday: "",
  });
  const [dbowRawText, setDbowRawText] = useState<string>("");
  const [dbowEntries, setDbowEntries] = useState<DBOWEntry[]>([]);
  const [dbowMetadata, setDbowMetadata] = useState<DBOWMetadata | null>(null);
  const [planType, setPlanType] = useState<PlanType>("dlp");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateMeta | null>(null);
  const { t } = useI18n();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<LessonPlanInput>({
    resolver: zodResolver(
      z.object({
        gradeLevel: z.string().min(1, "Grade level is required"),
        learningArea: z.string().min(1, "Learning area is required"),
        quarter: z.string().min(1, "Quarter is required"),
        week: z.string().min(1, "Week is required"),
        subjectDescription: z.string().min(1, "Subject description is required"),
        curriculumType: z.enum(["K-12", "MATATAG"]),
        teachingMethod: z.enum(["5Es", "DEAL", "custom"]),
        teachingMethodCustom: z.string().optional(),
        competencies: z.string().optional(),
        coiTags: z.string().optional(),
        planType: z.enum(["dlp", "wlp"]),
        teacherName: z.string().optional(),
        schoolName: z.string().optional(),
        section: z.string().optional(),
        dayNumber: z.string().optional(),
        calendarDate: z.string().optional(),
        startDate: z.string().optional(),
      })
    ),
    defaultValues: {
      curriculumType: "MATATAG",
      teachingMethod: "5Es",
      planType: "dlp",
      startDate: "June 8, 2026",
    },
  });

  // Pre-fill teacher name from saved default, then persist edits
  useEffect(() => {
    const saved = loadCachedTeacherName();
    if (saved) {
      setValue("teacherName", saved, { shouldDirty: false });
    }
  }, [setValue]);

  const teacherName = watch("teacherName");
  useEffect(() => {
    if (teacherName && teacherName.trim()) {
      saveCachedTeacherName(teacherName.trim());
    }
  }, [teacherName]);

  // Pre-fill school name from saved default (or the school default), then persist edits
  useEffect(() => {
    const saved = loadCachedSchoolName();
    if (saved) {
      setValue("schoolName", saved, { shouldDirty: false });
    } else {
      setValue("schoolName", "LAS PIÑAS CAA NATIONAL HIGH SCHOOL", { shouldDirty: false });
    }
  }, [setValue]);

  const schoolName = watch("schoolName");
  useEffect(() => {
    if (schoolName && schoolName.trim()) {
      saveCachedSchoolName(schoolName.trim());
    }
  }, [schoolName]);

  // Pre-fill section from saved default, then persist edits
  useEffect(() => {
    const saved = loadCachedSection();
    if (saved) {
      setValue("section", saved, { shouldDirty: false });
    }
  }, [setValue]);

  const section = watch("section");
  useEffect(() => {
    if (section && section.trim()) {
      saveCachedSection(section.trim());
    }
  }, [section]);

  // Auto-fill form when DBOW entry is selected
  const handleTemplateSelect = useCallback(
    (template: TemplateMeta | null) => {
      setSelectedTemplate(template);
      onTemplateSelect?.(template);
    },
    [onTemplateSelect]
  );

  const handleDBOWParsed = useCallback((data: DBOWData) => {
    setDbowEntries(data.entries);
    setDbowRawText(data.rawText);
  }, []);

  const handleDBOWSelection = useCallback(
    (entry: DBOWEntry, rawText: string, metadata: DBOWMetadata) => {
      setSelectedDBOW(entry);
      setDbowRawText(rawText);
      setDbowMetadata(metadata);

      // Auto-fill grade level and learning area from DBOW metadata
      if (metadata.gradeLevel) {
        const gradeExists = GRADE_LEVELS.includes(metadata.gradeLevel);
        if (gradeExists) {
          setValue("gradeLevel", metadata.gradeLevel);
        }
      }

      if (metadata.learningArea) {
        const matchedArea = LEARNING_AREAS.find(
          (a) => a.toLowerCase() === metadata.learningArea.toLowerCase()
        );
        if (matchedArea) {
          setValue("learningArea", matchedArea);
        }
      }

      if (entry.contentArea) {
        setValue("subjectDescription", entry.contentArea);
      }

      if (entry.competency) {
        setValue("competencies", entry.competency);
      }

      // Auto-detect quarter from term
      if (entry.term) {
        const termMatch = entry.term.match(/(First|Second|Third)\s+Term/i);
        if (termMatch) {
          const termKey = termMatch[1].charAt(0).toUpperCase() + termMatch[1].slice(1).toLowerCase();
          const termToQuarter: Record<string, string> = {
            First: "Quarter 1",
            Second: "Quarter 2",
            Third: "Quarter 3",
          };
          setValue("quarter", termToQuarter[termKey] || "Quarter 1");
        }
      }

      // Auto-fill day number from DBOW entry
      if (entry.dayNumber || entry.day) {
        setValue("dayNumber", entry.dayNumber || entry.day);
      }

      // Parse week number and day number for computation
      const weekFromEntry = (entry.weekRange || "").match(/Week\s+(\d+)/i);
      const dayFromEntry = (entry.day || "").match(/Day\s+(\d+)/i);
      const weekNum = weekFromEntry ? parseInt(weekFromEntry[1], 10) : NaN;
      const dayNum = dayFromEntry ? parseInt(dayFromEntry[1], 10) : NaN;

      // Auto-fill week from DBOW entry
      if (!isNaN(weekNum) && weekNum >= 1 && weekNum <= 10) {
        setValue("week", `Week ${weekNum}`);
      }

      // Auto-fill calendar date from DBOW entry
      const dateValue = entry.specificDate || entry.date || "";
      if (dateValue) {
        setValue("calendarDate", dateValue);
      }

      // Reference is TERM-AWARE: the DBOW restarts Day_Number at 1 each term
      // (Second Term Day 1 is NOT Term 1 Day 1), so the sequential counter must
      // be anchored to that term's official start date. Pure Mon-Fri weeks, no
      // holiday subtraction.
      const termName = ((entry.term || "").match(/(First|Second|Third)\s+Term/i)?.[1] || "First").charAt(0).toUpperCase() + (((entry.term || "").match(/(First|Second|Third)\s+Term/i)?.[1] || "First").slice(1).toLowerCase());
      const TERM_REFERENCE_DATES: Record<string, Date> = {
        First: new Date(2026, 5, 8), // June 8, 2026 (Term 1)
        Second: new Date(2026, 10, 3), // Nov 3, 2026 (Term 2)
        Third: new Date(2027, 2, 15), // Mar 15, 2027 (Term 3)
      };
      const REFERENCE_DATE = TERM_REFERENCE_DATES[termName];
      const REFERENCE_WEEK = 1;

      // The DBOW Day_Number is a sequential school-day counter (Day 1..N), so use
      // the deterministic Date Engine (pure Mon-Fri weeks, no holiday subtraction)
      // to derive the calendar date from the day number.
      const computed = isNaN(dayNum) ? null : computeDateForSequentialDay(REFERENCE_DATE, dayNum, []);
      if (computed) {
        setValue("calendarDate", computed.formattedDate);
      }

      // Case 2: We have date but no week → compute week from date
      if (dateValue && isNaN(weekNum)) {
        const parsed = new Date(dateValue);
        if (!isNaN(parsed.getTime())) {
          const diffTime = parsed.getTime() - REFERENCE_DATE.getTime();
          const diffWeeks = Math.round(diffTime / (7 * 24 * 60 * 60 * 1000));
          const computedWeek = REFERENCE_WEEK + diffWeeks;
          if (computedWeek >= 1 && computedWeek <= 10) {
            setValue("week", `Week ${computedWeek}`);
          }
        }
      }

      // Case 3: We have date but no day → compute day from date
      if (dateValue && isNaN(dayNum)) {
        const parsed = new Date(dateValue);
        if (!isNaN(parsed.getTime())) {
          const dayResult = computeDayNumberForDate(parsed, REFERENCE_DATE, []);
          if (dayResult && dayResult.dayNumber >= 1 && dayResult.dayNumber <= 5) {
            setValue("dayNumber", `Day ${dayResult.dayNumber}`);
          }
        }
      }
    },
    [setValue]
  );

  const handleDBOWClear = useCallback(() => {
    setSelectedDBOW(null);
    setSelectedWeekEntries([]);
    setDbowMetadata(null);
    setDbowRawText("");
    setDbowEntries([]);
  }, []);

  const handleDBOWWeekSelection = useCallback(
    (entries: DBOWEntry[], rawText: string, metadata: DBOWMetadata) => {
      setSelectedWeekEntries(entries);
      setSelectedDBOW(entries[0] || null);
      setDbowRawText(rawText);
      setDbowMetadata(metadata);

      const first = entries[0];
      if (!first) return;

      if (metadata.gradeLevel) {
        const gradeExists = GRADE_LEVELS.includes(metadata.gradeLevel);
        if (gradeExists) {
          setValue("gradeLevel", metadata.gradeLevel);
        }
      }

      if (metadata.learningArea) {
        const matchedArea = LEARNING_AREAS.find(
          (a) => a.toLowerCase() === metadata.learningArea.toLowerCase()
        );
        if (matchedArea) {
          setValue("learningArea", matchedArea);
        }
      }

      if (first.contentArea) {
        setValue("subjectDescription", first.contentArea);
      }

      if (first.term) {
        const termMatch = first.term.match(/(First|Second|Third)\s+Term/i);
        if (termMatch) {
          const termKey = termMatch[1].charAt(0).toUpperCase() + termMatch[1].slice(1).toLowerCase();
          const termToQuarter: Record<string, string> = {
            First: "Quarter 1",
            Second: "Quarter 2",
            Third: "Quarter 3",
          };
          setValue("quarter", termToQuarter[termKey] || "Quarter 1");
        }
      }

      const weekFromEntry = (first.weekRange || "").match(/Week\s+(\d+)/i);
      const weekNum = weekFromEntry ? parseInt(weekFromEntry[1], 10) : NaN;
      if (!isNaN(weekNum) && weekNum >= 1 && weekNum <= 10) {
        setValue("week", `Week ${weekNum}`);
      }

      // Aggregate all 5 days' competencies + objectives so the WLP prompt
      // sees the real week scope instead of a single day.
      const weeklyCompetencies = entries
        .map(
          (e) =>
            `Day ${(e.day || "").replace(/Day\s*/, "")} (${e.specificDate || e.date || "—"}): ${e.competency}\nObjective: ${e.objective}`
        )
        .join("\n\n");

      setValue("competencies", weeklyCompetencies);

      // Derive per-day calendar dates (Monday..Friday) for the WLP.
      // Prefer the DBOW's own per-day dates when available (source of truth);
      // otherwise compute them with the Date Engine so the AI never makes a
      // calendar mistake. The Date Engine reference is TERM-AWARE: the DBOW
      // restarts Day_Number at 1 each term (Second Term Day 1 is NOT Term 1
      // Day 1), so the sequential counter must be anchored to that term's
      // official start date (pure Mon-Fri weeks, no holiday subtraction).
      const termName = ((first.term || "").match(/(First|Second|Third)\s+Term/i)?.[1] || "First").charAt(0).toUpperCase() + (((first.term || "").match(/(First|Second|Third)\s+Term/i)?.[1] || "First").slice(1).toLowerCase());
      const TERM_REFERENCE_DATES: Record<string, Date> = {
        First: new Date(2026, 5, 8), // June 8, 2026 (Term 1)
        Second: new Date(2026, 10, 3), // Nov 3, 2026 (Term 2)
        Third: new Date(2027, 2, 15), // Mar 15, 2027 (Term 3)
      };
      const REFERENCE_DATE = TERM_REFERENCE_DATES[termName];
      const dayKeys = ["monday", "tuesday", "wednesday", "thursday", "friday"] as const;
      const dayNumOf = (e: DBOWEntry) =>
        parseInt(
          (e.dayNumber || e.day || "").replace(/\D/g, "") || "0",
          10
        );
      const sorted = [...entries].sort((a, b) => dayNumOf(a) - dayNumOf(b));
      const nextDates: WeekDates = { monday: "", tuesday: "", wednesday: "", thursday: "", friday: "" };
      sorted.slice(0, 5).forEach((e, i) => {
        const key = dayKeys[i];
        if (!key) return;
        const raw = e.specificDate || e.date || "";
        const dayNum = dayNumOf(e);

        // 1) DBOW's own date (source of truth) takes priority.
        const dbowDate = parseDateInput(raw);
        // 2) Fallback: Date Engine anchored to the term's start date.
        const computed = !dbowDate && dayNum >= 1 ? computeDateForSequentialDay(REFERENCE_DATE, dayNum, []) : null;
        const parsed = dbowDate || computed?.date || null;
        if (parsed) {
          const y = parsed.getFullYear();
          const m = String(parsed.getMonth() + 1).padStart(2, "0");
          const d = String(parsed.getDate()).padStart(2, "0");
          nextDates[key] = `${y}-${m}-${d}`;
        }
      });
      setWeekDates(nextDates);
    },
    [setValue]
  );

  const onSubmit = async (data: LessonPlanInput) => {
    setLoading(true);
    setError(null);

    // Add planType, DBOW entry, template, and start date to the payload
    const isWeek = planType === "wlp";
    const enhancedData = {
      ...data,
      planType,
      startDate: data.startDate,
      templateId: selectedTemplate?.id,
      dbowEntry: isWeek ? (selectedWeekEntries[0] || null) : (selectedDBOW || null),
      dbowEntries: isWeek ? selectedWeekEntries : (selectedDBOW ? dbowEntries : undefined),
      dbowRawText: selectedDBOW ? dbowRawText : undefined,
      weekDates: isWeek ? weekDates : undefined,
      competencies: isWeek
        ? `${selectedWeekEntries
            .map(
              (e) =>
                `Day ${(e.day || "").replace(/Day\s*/, "")} (${e.specificDate || e.date || "—"}): ${e.competency}\nObjective: ${e.objective}`
            )
            .join("\n\n")}\n\nDBOW Context: ${dbowRawText.substring(0, 2000)}...`
        : selectedDBOW
          ? `${selectedDBOW.competency}\n\nDay: ${selectedDBOW.day} | Objective: ${selectedDBOW.objective}\n\nDBOW Context: ${dbowRawText.substring(0, 2000)}...`
          : data.competencies,
    };

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enhancedData),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to generate lesson plan");
      }

      const result = await response.json();
      onGenerated(result.lessonPlan, data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const goNext = async () => {
    if (currentStep === 2) {
      const valid = await trigger([
        "gradeLevel",
        "learningArea",
        "quarter",
        "week",
        "subjectDescription",
      ]);
      if (!valid) return;
    }
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Stepper */}
      <ol className="flex items-center justify-between gap-2 sm:gap-4">
        {STEPS.map((step, idx) => {
          const isActive = idx === currentStep;
          const isDone = idx < currentStep;
          return (
            <li key={step.title} className="flex items-center gap-2 sm:gap-3 flex-1 last:flex-none">
              <button
                type="button"
                onClick={() => idx < currentStep && setCurrentStep(idx)}
                className={`flex items-center gap-2 ${idx < currentStep ? "cursor-pointer" : "cursor-default"}`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium border transition-colors ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : isDone
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  {isDone ? <Check className="h-4 w-4" /> : idx + 1}
                </span>
                <span className={`hidden sm:block text-sm font-medium ${isActive ? "text-foreground" : isDone ? "text-foreground" : "text-muted-foreground"}`}>
                  {step.title}
                </span>
              </button>
              {idx < STEPS.length - 1 && (
                <span
                  className={`h-px flex-1 transition-colors ${isDone ? "bg-primary" : "bg-border"}`}
                />
              )}
            </li>
          );
        })}
      </ol>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Step 1: Plan Type */}
      {currentStep === 0 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Plan Type</h2>
            <p className="text-sm text-muted-foreground">
              Choose the format of the lesson plan you want to generate.
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                <Button
                  type="button"
                  variant={planType === "dlp" ? "default" : "outline"}
                  onClick={() => { setPlanType("dlp"); setValue("planType", "dlp"); }}
                  className="w-full sm:flex-1"
                >
                  Daily Lesson Plan (DLP)
                </Button>
                <Button
                  type="button"
                  variant={planType === "wlp" ? "default" : "outline"}
                  onClick={() => { setPlanType("wlp"); setValue("planType", "wlp"); }}
                  className="w-full sm:flex-1"
                >
                  Weekly Lesson Plan (WLP)
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {planType === "dlp"
                  ? "Generate a single-day lesson plan (Day 1 topic) following the ILAW 5E model."
                  : "Generate a full week plan (Monday–Friday) using all 5 DBOW days for the chosen week."}
              </p>
            </CardContent>
          </Card>

          {/* Template Upload Section (for DLP template-based export) */}
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <span className="inline-flex items-center gap-2">
                <svg className="h-4 w-4 transition-transform group-open:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
                DLP Template (Optional — Upload .docx to fill instead of generating from scratch)
              </span>
            </summary>
            <div className="mt-3">
              <TemplateUpload
                selectedTemplateId={selectedTemplate?.id || null}
                onSelectTemplate={handleTemplateSelect}
              />
            </div>
          </details>

          <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <Button
              type="button"
              size="lg"
              onClick={goNext}
              className="w-full sm:w-auto"
            >
              Next: Choose Topic
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Topic from DBOW */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Choose the Topic</h2>
            <p className="text-sm text-muted-foreground">
              {planType === "wlp"
                ? "Click any topic — the next 4 topics will be auto-selected. You can click individual topics to remove or change them (5 topics = Monday to Friday)."
                : "Upload your DBOW and pick the day/topic you want to plan for."}
            </p>
          </div>
          <DBOWUpload
            onSelection={handleDBOWSelection}
            onWeekSelection={planType === "wlp" ? handleDBOWWeekSelection : undefined}
            onClear={handleDBOWClear}
            selectedEntry={selectedDBOW}
            selectedWeekEntries={planType === "wlp" ? selectedWeekEntries : undefined}
            onParsed={handleDBOWParsed}
            selectionMode={planType === "wlp" ? "week" : "day"}
          />

          {planType === "wlp" && selectedWeekEntries.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <p className="text-sm font-medium text-primary">
                {selectedWeekEntries.length}/5 Topics Selected
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedWeekEntries[0].weekRange} • {selectedWeekEntries[0].term} — click a topic in the list to remove or change it.
              </p>
              <div className="flex flex-wrap gap-2 mt-2 text-xs">
                {selectedWeekEntries.map((e) => (
                  <Badge key={`${e.day}-${e.objective}`} variant="outline">
                    {e.day}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {planType === "dlp" && selectedDBOW && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <p className="text-sm font-medium text-primary">DBOW Context Active</p>
              <p className="text-xs text-muted-foreground mt-1">
                Selected: {selectedDBOW.day} — {selectedDBOW.objective}
              </p>
              <div className="flex flex-wrap gap-2 mt-2 text-xs">
                {selectedDBOW.weekRange && (
                  <Badge variant="outline">{selectedDBOW.weekRange}</Badge>
                )}
                {(selectedDBOW.specificDate || selectedDBOW.date) && (
                  <Badge variant="outline">{selectedDBOW.specificDate || selectedDBOW.date}</Badge>
                )}
              </div>
            </div>
          )}

          {((planType === "wlp" && selectedWeekEntries.length > 0) || (planType === "dlp" && selectedDBOW)) && dbowMetadata && (
            <div className="bg-muted/50 border rounded-lg p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Auto-detected from DBOW:</p>
              <div className="flex flex-wrap gap-2 text-xs">
                {dbowMetadata.gradeLevel && (
                  <Badge variant="secondary">{dbowMetadata.gradeLevel}</Badge>
                )}
                {dbowMetadata.learningArea && (
                  <Badge variant="secondary">{dbowMetadata.learningArea}</Badge>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <Button type="button" variant="outline" size="lg" onClick={goBack} className="w-full sm:w-auto">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:gap-2 sm:justify-end">
              <Button type="button" variant="ghost" onClick={() => setCurrentStep(2)} className="w-full sm:w-auto">
                Skip — I don&apos;t have a DBOW
              </Button>
              <Button
                type="button"
                size="lg"
                onClick={goNext}
                disabled={planType === "dlp" ? !selectedDBOW : selectedWeekEntries.length === 0}
                className="w-full sm:w-auto"
              >
                Next: Lesson Information
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Lesson Information */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Lesson Information</h2>
            <p className="text-sm text-muted-foreground">
              Fill in the details of the lesson. Values are pre-filled when a DBOW topic is selected.
            </p>
          </div>

          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6">
                <div className="space-y-2">
                  <Label>{t("gradeLevel")}</Label>
                  <Select
                    value={watch("gradeLevel") ?? ""}
                    onValueChange={(val) => { if (val) setValue("gradeLevel", val) }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADE_LEVELS.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.gradeLevel && (
                    <p className="text-xs text-destructive">{errors.gradeLevel.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Section</Label>
                  <Input
                    {...register("section")}
                    placeholder="e.g., Grade 9 - Ruby or Section 1"
                  />
                  <p className="text-xs text-muted-foreground">Saved as your default section — edit anytime</p>
                </div>

                <div className="space-y-2">
                  <Label>{t("learningArea")}</Label>
                  <Select
                    value={watch("learningArea") ?? ""}
                    onValueChange={(val) => { if (val) setValue("learningArea", val) }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEARNING_AREAS.map((a) => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.learningArea && (
                    <p className="text-xs text-destructive">{errors.learningArea.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>{t("quarter")}</Label>
                  <Select
                    value={watch("quarter") ?? ""}
                    onValueChange={(val) => { if (val) setValue("quarter", val) }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select quarter" />
                    </SelectTrigger>
                    <SelectContent>
                      {QUARTERS.map((q) => (
                        <SelectItem key={q} value={q}>{q}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.quarter && (
                    <p className="text-xs text-destructive">{errors.quarter.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>{t("week")}</Label>
                  <Select
                    value={watch("week") ?? ""}
                    onValueChange={(val) => { if (val) setValue("week", val) }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select week" />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKS.map((w) => (
                        <SelectItem key={w} value={w}>{w}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.week && (
                    <p className="text-xs text-destructive">{errors.week.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("subjectDescription")}</Label>
                <Input
                  {...register("subjectDescription")}
                  placeholder="e.g., Fractions and Decimals"
                />
                {errors.subjectDescription && (
                  <p className="text-xs text-destructive">{errors.subjectDescription.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6">
                <div className="space-y-2">
                  <Label>Teacher Name</Label>
                  <Input
                    {...register("teacherName")}
                    placeholder="e.g., Jose Rommel L. Garcia"
                  />
                  <p className="text-xs text-muted-foreground">Saved as your default teacher name — edit anytime</p>
                </div>

                <div className="space-y-2">
                  <Label>School Name</Label>
                  <Input
                    {...register("schoolName")}
                    placeholder="e.g., LAS PIÑAS CAA NATIONAL HIGH SCHOOL"
                  />
                  <p className="text-xs text-muted-foreground">Saved as your default school name — edit anytime</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Calendar Date (e.g., June 8, 2026)</Label>
                <Input
                  {...register("calendarDate")}
                  placeholder="e.g., July 24, 2026"
                />
                <p className="text-xs text-muted-foreground">Auto-filled from DBOW or enter manually</p>
              </div>

              {planType === "wlp" && (
                <div className="space-y-2 rounded-lg border p-3">
                  <Label>Weekly Calendar Dates (Monday–Friday)</Label>
                  <p className="text-xs text-muted-foreground">
                    Auto-filled from the selected DBOW week — edit any day as needed.
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
                    {(
                      [
                        ["monday", "Monday"],
                        ["tuesday", "Tuesday"],
                        ["wednesday", "Wednesday"],
                        ["thursday", "Thursday"],
                        ["friday", "Friday"],
                      ] as const
                    ).map(([key, label]) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-xs">{label}</Label>
                        <Input
                          value={isoToReadable(weekDates[key])}
                          placeholder="e.g., November 03, 2026"
                          onChange={(e) =>
                            setWeekDates((prev) => ({ ...prev, [key]: readableToIso(e.target.value) }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>School Year Start Date</Label>
                <Input
                  {...register("startDate")}
                  placeholder="e.g., June 8, 2026"
                />
                <p className="text-xs text-muted-foreground">
                  Used by the Date Engine to compute exact dates (skips weekends &amp; holidays)
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <Button type="button" variant="outline" size="lg" onClick={goBack} className="w-full sm:w-auto">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={loading}>
              {loading ? (
                <>
                  <Loader size="sm" className="mr-2" />
                  {t("generating")}
                </>
              ) : planType === "wlp" ? (
                "Generate Weekly Lesson Plan"
              ) : (
                t("generatePlan")
              )}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
