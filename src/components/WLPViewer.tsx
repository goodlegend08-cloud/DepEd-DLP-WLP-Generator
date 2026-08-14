"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { WeeklyLessonPlan, LessonPlanInput } from "@/types/lesson-plan";

interface WLPViewerProps {
  plan: WeeklyLessonPlan;
  input?: LessonPlanInput;
  /** When provided, text fields become editable via double-click. */
  onEdit?: (key: string, value: string) => void;
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"] as const;
const DAY_LABELS: Record<string, string> = {
  monday: "MONDAY",
  tuesday: "TUESDAY",
  wednesday: "WEDNESDAY",
  thursday: "THURSDAY",
  friday: "FRIDAY",
};

/** Text that becomes an editable textarea on double-click. */
function EditableText({
  value,
  onEdit,
  className,
}: {
  value: string;
  onEdit?: (value: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      ref.current.setSelectionRange(ref.current.value.length, ref.current.value.length);
    }
  }, [editing]);

  if (!onEdit) {
    return <span className={className}>{value}</span>;
  }

  if (editing) {
    const commit = () => {
      setEditing(false);
      if (draft !== value) onEdit(draft);
    };
    return (
      <textarea
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            commit();
          }
        }}
        rows={Math.max(2, Math.ceil(draft.length / 60))}
        className="w-full text-xs p-2 border border-primary rounded bg-background focus:outline-none"
      />
    );
  }

  return (
    <span
      className={`${className || ""} cursor-text hover:bg-muted/50 rounded px-1`}
      title="Double-click to edit"
      onDoubleClick={() => setEditing(true)}
    >
      {value}
    </span>
  );
}

/** Flatten a structured daily-activities object into a readable text block. */
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
    const lines: string[] = [];
    const collect = (obj: Record<string, unknown>, depth: number) => {
      for (const [key, val] of Object.entries(obj)) {
        if (val == null) continue;
        if (typeof val === "string") {
          lines.push(`• ${key}: ${val.trim()}`);
        } else if (typeof val === "object") {
          if (depth < 2) collect(val as Record<string, unknown>, depth + 1);
        } else {
          lines.push(`• ${key}: ${String(val)}`);
        }
      }
    };
    collect(value as Record<string, unknown>, 0);
    return lines.join("\n");
  }
  return "";
}

/** Normalize a day entry that may come wrapped or as a bare structured object. */
function normalizeDay(day: string, rawDay: unknown): { day: string; date: string; activities: string } {
  if (!rawDay || typeof rawDay !== "object") {
    return { day, date: "", activities: "" };
  }
  const obj = rawDay as Record<string, unknown>;
  const activitiesValue =
    typeof obj.activities === "string" || obj.activities == null ? obj.activities : obj.activities ?? obj;
  return {
    day: typeof obj.day === "string" ? obj.day : day,
    date: typeof obj.date === "string" ? obj.date : "",
    activities: flattenActivities(activitiesValue),
  };
}

export function WLPViewer({ plan, input, onEdit }: WLPViewerProps) {
  const days = Object.fromEntries(
    DAYS.map((day) => [day, normalizeDay(day, plan[day])])
  ) as Record<(typeof DAYS)[number], { day: string; date: string; activities: string }>;

  const textFields = ["weeklyObjectives", "weeklyCompetencies", "weeklyContent", "learningResources", "remarks", "reflection"] as const;
  const texts = Object.fromEntries(
    textFields.map((key) => [key, flattenActivities((plan as unknown as Record<string, unknown>)[key])])
  ) as Record<(typeof textFields)[number], string>;
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center py-4 border-b-2 border-primary">
        <p className="text-xs text-muted-foreground">NATIONAL CAPITAL REGION</p>
        <p className="text-xs text-muted-foreground">SCHOOLS DIVISION OF LAS PIÑAS CITY</p>
        <p className="text-xs text-muted-foreground">S.Y. 2026-2027 | FIRST TERM</p>
        <h2 className="text-xl font-bold text-primary mt-2">WEEKLY LESSON PLAN (WLP)</h2>
        <p className="text-sm font-semibold uppercase">{input?.learningArea || "SCIENCE"}</p>
      </div>

      {/* Metadata */}
      {input && (
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="secondary">Grade {input.gradeLevel}</Badge>
          <Badge variant="secondary">{input.learningArea}</Badge>
          <Badge variant="secondary">{input.quarter}</Badge>
          <Badge variant="secondary">{input.week}</Badge>
          <Badge variant="outline">{input.curriculumType}</Badge>
          <Badge variant="outline">{input.teachingMethod}</Badge>
        </div>
      )}

      {/* Weekly Objectives */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base bg-primary text-primary-foreground py-2 px-4 rounded">
            WEEKLY OBJECTIVES & COMPETENCIES
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold mb-1 bg-blue-50 py-1 px-2 rounded">Weekly Competencies</h4>
            <p className="text-sm whitespace-pre-wrap">
              <EditableText value={texts.weeklyCompetencies} onEdit={onEdit ? (v) => onEdit("weeklyCompetencies", v) : undefined} className="whitespace-pre-wrap" />
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-1 bg-blue-50 py-1 px-2 rounded">Weekly Objectives</h4>
            <p className="text-sm whitespace-pre-wrap">
              <EditableText value={texts.weeklyObjectives} onEdit={onEdit ? (v) => onEdit("weeklyObjectives", v) : undefined} className="whitespace-pre-wrap" />
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-1 bg-blue-50 py-1 px-2 rounded">Weekly Content Overview</h4>
            <p className="text-sm whitespace-pre-wrap">
              <EditableText value={texts.weeklyContent} onEdit={onEdit ? (v) => onEdit("weeklyContent", v) : undefined} className="whitespace-pre-wrap" />
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Daily Plans */}
      {DAYS.map((day) => {
        const dayPlan = days[day];
        return (
          <Card key={day}>
            <CardHeader>
              <CardTitle className="text-base bg-primary text-primary-foreground py-2 px-4 rounded">
                {DAY_LABELS[day]} —{" "}
                <EditableText value={dayPlan.date} onEdit={onEdit ? (v) => onEdit(`${day}.date`, v) : undefined} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm whitespace-pre-wrap text-muted-foreground">
                <EditableText value={dayPlan.activities} onEdit={onEdit ? (v) => onEdit(`${day}.activities`, v) : undefined} className="whitespace-pre-wrap" />
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Learning Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base bg-primary text-primary-foreground py-2 px-4 rounded">
            LEARNING RESOURCES
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">
            <EditableText value={texts.learningResources} onEdit={onEdit ? (v) => onEdit("learningResources", v) : undefined} className="whitespace-pre-wrap" />
          </p>
        </CardContent>
      </Card>

      {/* Remarks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base bg-primary text-primary-foreground py-2 px-4 rounded">
            REMARKS & INTEGRATION
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">
            <EditableText value={texts.remarks} onEdit={onEdit ? (v) => onEdit("remarks", v) : undefined} className="whitespace-pre-wrap" />
          </p>
        </CardContent>
      </Card>

      {/* Reflection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base bg-primary text-primary-foreground py-2 px-4 rounded">
            TEACHER REFLECTION
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">
            <EditableText value={texts.reflection} onEdit={onEdit ? (v) => onEdit("reflection", v) : undefined} className="whitespace-pre-wrap" />
          </p>
        </CardContent>
      </Card>

      {/* Signatories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base bg-primary text-primary-foreground py-2 px-4 rounded">
            SIGNATORIES
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-1">Prepared by</h4>
            <p className="text-sm text-muted-foreground">___________________________________<br />[Teacher Name]<br />Teacher I</p>
          </div>
          <Separator />
          <div>
            <h4 className="text-sm font-semibold mb-1">Checked & Reviewed by</h4>
            <p className="text-sm text-muted-foreground">___________________________________<br />[Master Teacher Name]<br />Master Teacher</p>
          </div>
          <Separator />
          <div>
            <h4 className="text-sm font-semibold mb-1">Noted by</h4>
            <p className="text-sm text-muted-foreground">___________________________________<br />[Principal Name]<br />School Principal IV</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
