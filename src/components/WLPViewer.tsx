"use client";

import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
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

/** Solid black 1pt grid cell border. */
const CELL_BORDER = "border border-black";
/** Light-gray section banner fill (#D9D9D9 per template). */
const BANNER_FILL = "bg-[#D9D9D9]";

/** Gray section banner row: bold title (left) + italic guidance (right). */
function BannerRow({ title, guidance }: { title: string; guidance?: string }) {
  return (
    <tr>
      <td className={`${CELL_BORDER} ${BANNER_FILL} p-2 w-1/3 align-top`}>
        <span className="text-sm font-bold">{title}</span>
      </td>
      <td className={`${CELL_BORDER} ${BANNER_FILL} p-2 text-xs italic align-top`}>
        {guidance}
      </td>
    </tr>
  );
}

/** Metadata key-value row: bold label (left), value (right). */
function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <tr>
      <td className={`${CELL_BORDER} p-2 w-1/3 font-semibold text-xs align-top`}>{label}</td>
      <td className={`${CELL_BORDER} p-2 text-xs whitespace-pre-wrap align-top`}>{children}</td>
    </tr>
  );
}

/** Subsection row: italic-bold label (left), content (right). */
function SubRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <tr>
      <td className={`${CELL_BORDER} p-2 w-1/3 align-top`}>
        <p className="text-xs font-bold italic">{label}</p>
      </td>
      <td className={`${CELL_BORDER} p-2 text-xs whitespace-pre-wrap align-top`}>{children}</td>
    </tr>
  );
}

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
  const lessonTitle = input?.subjectDescription || "Weekly Lesson Plan";
  const days = Object.fromEntries(
    DAYS.map((day) => [day, normalizeDay(day, plan[day])])
  ) as Record<(typeof DAYS)[number], { day: string; date: string; activities: string }>;

  const textFields = ["weeklyObjectives", "weeklyCompetencies", "weeklyContent", "learningResources", "remarks", "reflection"] as const;
  const texts = Object.fromEntries(
    textFields.map((key) => [key, flattenActivities((plan as unknown as Record<string, unknown>)[key])])
  ) as Record<(typeof textFields)[number], string>;
  return (
    <div className="text-black">
      {/* Official LPCAA DepEd Header Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/lpcaa header.png"
        alt="LPCAA DepEd Header"
        className="w-full max-w-3xl mx-auto mb-4"
      />

      {/* Title */}
      <div className="text-center py-2">
        <h2 className="text-base font-bold uppercase tracking-wide">WEEKLY LESSON PLAN (WLP)</h2>
        <p className="text-sm font-semibold uppercase">{input?.learningArea || "SCIENCE"}</p>
      </div>

      {/* Metadata Table */}
      <table className="w-full border-collapse border border-black text-sm">
        <tbody>
          <MetaRow label="Name of Lesson">
            <EditableText value={lessonTitle} onEdit={onEdit ? (v) => onEdit("nameOfLesson", v) : undefined} />
          </MetaRow>
          <MetaRow label="Week">
            {input ? `${input.quarter} | ${input.week}` : ""}
          </MetaRow>
          <MetaRow label="Designed by teacher/s">
            {input?.teacherName || "[Teacher Name]"}
          </MetaRow>
          <MetaRow label="Designed for which Grade Level and Section">
            Grade {input?.gradeLevel || ""}
          </MetaRow>
          <MetaRow label="No. of Sessions">
            5 Sessions (50 minutes each)
          </MetaRow>
          <MetaRow label="References (books, websites, toolkits, etc.)">
            MATATAG K-10 Curriculum Guide; DepEd Science Learning Materials; DepEd MATATAG Curriculum Resources; Division DBOW.
          </MetaRow>
        </tbody>
      </table>

      {/* Weekly Objectives */}
      <table className="w-full border-collapse border border-black text-sm">
        <tbody>
          <BannerRow title="Weekly Objectives & Competencies." guidance="Weekly competencies, objectives, and the content overview for the week." />
          <SubRow label="Weekly Competencies:">
            <EditableText value={texts.weeklyCompetencies} onEdit={onEdit ? (v) => onEdit("weeklyCompetencies", v) : undefined} className="whitespace-pre-wrap" />
          </SubRow>
          <SubRow label="Weekly Objectives:">
            <EditableText value={texts.weeklyObjectives} onEdit={onEdit ? (v) => onEdit("weeklyObjectives", v) : undefined} className="whitespace-pre-wrap" />
          </SubRow>
          <SubRow label="Weekly Content Overview:">
            <EditableText value={texts.weeklyContent} onEdit={onEdit ? (v) => onEdit("weeklyContent", v) : undefined} className="whitespace-pre-wrap" />
          </SubRow>
        </tbody>
      </table>

      {/* Daily Plans */}
      {DAYS.map((day) => {
        const dayPlan = days[day];
        return (
          <table key={day} className="w-full border-collapse border border-black text-sm">
            <tbody>
              <BannerRow title={`${DAY_LABELS[day]} — ${dayPlan.date}`} guidance="" />
              <tr>
                <td colSpan={2} className={`${CELL_BORDER} p-2 text-xs whitespace-pre-wrap align-top`}>
                  <EditableText value={dayPlan.activities} onEdit={onEdit ? (v) => onEdit(`${day}.activities`, v) : undefined} className="whitespace-pre-wrap" />
                </td>
              </tr>
            </tbody>
          </table>
        );
      })}

      {/* Learning Resources */}
      <table className="w-full border-collapse border border-black text-sm">
        <tbody>
          <BannerRow title="Learning Resources." guidance="Resources used to reach the weekly objectives." />
          <tr>
            <td colSpan={2} className={`${CELL_BORDER} p-2 text-xs whitespace-pre-wrap align-top`}>
              <EditableText value={texts.learningResources} onEdit={onEdit ? (v) => onEdit("learningResources", v) : undefined} className="whitespace-pre-wrap" />
            </td>
          </tr>
        </tbody>
      </table>

      {/* Remarks */}
      <table className="w-full border-collapse border border-black text-sm">
        <tbody>
          <BannerRow title="Remarks & Integration." guidance="Integration notes and remarks for the week." />
          <tr>
            <td colSpan={2} className={`${CELL_BORDER} p-2 text-xs whitespace-pre-wrap align-top`}>
              <EditableText value={texts.remarks} onEdit={onEdit ? (v) => onEdit("remarks", v) : undefined} className="whitespace-pre-wrap" />
            </td>
          </tr>
        </tbody>
      </table>

      {/* Reflection */}
      <table className="w-full border-collapse border border-black text-sm">
        <tbody>
          <BannerRow title="Teacher Reflection." guidance="Reflect on the week to guide the next sessions." />
          <tr>
            <td colSpan={2} className={`${CELL_BORDER} p-2 text-xs whitespace-pre-wrap align-top`}>
              <EditableText value={texts.reflection} onEdit={onEdit ? (v) => onEdit("reflection", v) : undefined} className="whitespace-pre-wrap" />
            </td>
          </tr>
        </tbody>
      </table>

      {/* Signatories — clean unbordered paragraph text after the tables */}
      <div className="mt-8 space-y-6">
        {/* Prepared */}
        <div>
          <p className="font-bold">Prepared:</p>
          <div className="mt-2 flex">
            <div className="flex-1 text-center">
              <p className="font-bold uppercase">{input?.teacherName || "JOSE ROMMEL L. GARCIA"}</p>
              <div className="mx-auto my-1 border-b-2 border-black w-52" />
              <p className="italic">Teacher III</p>
            </div>
          </div>
        </div>

        {/* Checked & Reviewed (3-column spacing, no gridlines) */}
        <div>
          <p className="font-bold">Checked &amp; Reviewed:</p>
          <div className="mt-2 flex">
            <div className="flex-1 text-center">
              <p className="font-bold">TRIXIA A. PALMOS</p>
              <div className="mx-auto my-1 border-b-2 border-black w-52" />
              <p className="italic">Master Teacher II - Science</p>
            </div>
            <div className="flex-1 text-center">
              <p className="font-bold">CARMELITA G. YAP</p>
              <div className="mx-auto my-1 border-b-2 border-black w-52" />
              <p className="italic">SCIENCE Coordinator</p>
            </div>
            <div className="flex-1 text-center">
              <p className="font-bold">Jeanette J. Ruga, Ph.D.</p>
              <div className="mx-auto my-1 border-b-2 border-black w-52" />
              <p className="italic">Assistant school Principal II / Officer – in – Charge</p>
            </div>
          </div>
        </div>

        {/* Noted (2-column spacing, no gridlines) */}
        <div>
          <p className="font-bold">Noted:</p>
          <div className="mt-2 flex">
            <div className="flex-1 text-center">
              <p className="font-bold">MILDRED T. TUBLE</p>
              <div className="mx-auto my-1 border-b-2 border-black w-52" />
              <p className="italic">Public Schools District Supervisor – Cluster I</p>
            </div>
            <div className="flex-1 text-center">
              <p className="font-bold">GENOVIE G. TAGUM, Ph.D.</p>
              <div className="mx-auto my-1 border-b-2 border-black w-52" />
              <p className="italic">Education Program Supervisor – SCIENCE</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
