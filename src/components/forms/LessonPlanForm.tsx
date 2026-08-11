"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { DBOWUpload } from "@/components/DBOWUpload";
import { TemplateUpload } from "@/components/TemplateUpload";
import type { DBOWEntry, DBOWMetadata } from "@/components/DBOWUpload";
import type { TemplateMeta } from "@/lib/template-processor";
import type { LessonPlanInput, GeneratedLessonPlan, GeneratedDLPPlan, WeeklyLessonPlan, PlanType } from "@/types/lesson-plan";

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
export function LessonPlanForm({ onGenerated, onTemplateSelect }: LessonPlanFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDBOW, setSelectedDBOW] = useState<DBOWEntry | null>(null);
  const [dbowRawText, setDbowRawText] = useState<string>("");
  const [dbowMetadata, setDbowMetadata] = useState<DBOWMetadata | null>(null);
  const [planType, setPlanType] = useState<PlanType>("dlp");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateMeta | null>(null);
  const { t } = useI18n();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
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
        dayNumber: z.string().optional(),
        calendarDate: z.string().optional(),
      })
    ),
    defaultValues: {
      curriculumType: "MATATAG",
      teachingMethod: "5Es",
      planType: "dlp",
    },
  });

  // Auto-fill form when DBOW entry is selected
  const handleTemplateSelect = useCallback(
    (template: TemplateMeta | null) => {
      setSelectedTemplate(template);
      onTemplateSelect?.(template);
    },
    [onTemplateSelect]
  );

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
          const termToQuarter: Record<string, string> = {
            First: "Quarter 1",
            Second: "Quarter 2",
            Third: "Quarter 3",
          };
          setValue("quarter", termToQuarter[termMatch[1]] || "Quarter 1");
        }
      }

      // Auto-fill day number from DBOW entry
      if (entry.day) {
        setValue("dayNumber", entry.day);
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

      // Reference: June 08, 2026 = Monday = Week 1, Day 1 (first day of class)
      const REFERENCE_DATE = new Date(2026, 5, 8); // June 8, 2026
      const REFERENCE_WEEK = 1;
      const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

      function formatDate(d: Date): string {
        return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
      }

      // Case 1: We have week+day but no date → compute date
      if (!dateValue && !isNaN(weekNum) && !isNaN(dayNum)) {
        const weeksOffset = weekNum - REFERENCE_WEEK;
        const daysOffset = dayNum - 1;
        const computed = new Date(REFERENCE_DATE);
        computed.setDate(REFERENCE_DATE.getDate() + weeksOffset * 7 + daysOffset);
        setValue("calendarDate", formatDate(computed));
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
          const diffTime = parsed.getTime() - REFERENCE_DATE.getTime();
          const totalDays = Math.round(diffTime / (24 * 60 * 60 * 1000));
          // Normalize to week: mod 7 to get day within week, +1 for 1-indexed
          const dayInWeek = ((totalDays % 7) + 7) % 7 + 1;
          if (dayInWeek >= 1 && dayInWeek <= 5) {
            setValue("dayNumber", `Day ${dayInWeek}`);
          }
        }
      }
    },
    [setValue]
  );

  const onSubmit = async (data: LessonPlanInput) => {
    setLoading(true);
    setError(null);

    // Add planType and DBOW context to competencies if available
    const enhancedData = {
      ...data,
      planType,
      competencies: selectedDBOW
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* DBOW Upload Section */}
      <DBOWUpload
        onSelection={handleDBOWSelection}
        selectedEntry={selectedDBOW}
      />

      {selectedDBOW && (
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

      {selectedDBOW && dbowMetadata && (
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lesson Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
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

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Teacher Name</Label>
              <Input
                {...register("teacherName")}
                placeholder="e.g., Jose Rommel L. Garcia"
              />
            </div>

            <div className="space-y-2">
              <Label>School Name</Label>
              <Input
                {...register("schoolName")}
                placeholder="e.g., LAS PIÑAS CAA NATIONAL HIGH SCHOOL"
                defaultValue="LAS PIÑAS CAA NATIONAL HIGH SCHOOL"
              />
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Plan Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={planType === "dlp" ? "default" : "outline"}
              onClick={() => { setPlanType("dlp"); setValue("planType", "dlp"); }}
              className="flex-1"
            >
              Daily Lesson Plan (DLP)
            </Button>
            <Button
              type="button"
              variant={planType === "wlp" ? "default" : "outline"}
              onClick={() => { setPlanType("wlp"); setValue("planType", "wlp"); }}
              className="flex-1"
            >
              Weekly Lesson Plan (WLP)
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {planType === "dlp"
              ? "Generate a single-day lesson plan following the 5E model."
              : "Generate a full week plan (Monday–Friday) with daily activities."}
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

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("generating")}
          </>
        ) : planType === "wlp" ? (
          "Generate Weekly Lesson Plan"
        ) : (
          t("generatePlan")
        )}
      </Button>
    </form>
  );
}
