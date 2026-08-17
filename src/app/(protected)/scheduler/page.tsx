"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CalendarDays } from "lucide-react";
import { Loader } from "@/components/Loader";
import type { ScheduleRow } from "@/lib/dbow-scheduler";
import { parseDateInput, formatLongDate, toISODate } from "@/lib/date-engine";

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

interface TermForm {
  name: string;
  startDate: string;
  endDate: string;
  examStart: string;
  examEnd: string;
}

interface HolidayForm {
  date: string;
  name: string;
}

const DEFAULT_TERMS: TermForm[] = [
  { name: "Term 1", startDate: "2026-06-08", endDate: "2026-10-16", examStart: "2026-10-12", examEnd: "2026-10-16" },
  { name: "Term 2", startDate: "2026-11-03", endDate: "2027-02-26", examStart: "2027-02-22", examEnd: "2027-02-26" },
  { name: "Term 3", startDate: "2027-03-15", endDate: "2027-06-04", examStart: "2027-05-31", examEnd: "2027-06-04" },
];

const DEFAULT_HOLIDAYS: HolidayForm[] = [
  { date: "2026-08-21", name: "Ninoy Aquino Day" },
  { date: "2026-08-31", name: "National Heroes Day" },
  { date: "2026-11-01", name: "All Saints' Day" },
  { date: "2026-11-30", name: "Bonifacio Day" },
  { date: "2026-12-08", name: "Feast of the Immaculate Conception" },
  { date: "2026-12-25", name: "Christmas Day" },
  { date: "2026-12-30", name: "Rizal Day" },
  { date: "2026-12-31", name: "Last Day of the Year" },
  { date: "2027-01-01", name: "New Year's Day" },
  { date: "2027-04-01", name: "Maundy Thursday" },
  { date: "2027-04-02", name: "Good Friday" },
  { date: "2027-04-09", name: "Araw ng Kagitingan" },
  { date: "2027-05-01", name: "Labor Day" },
];

const DEFAULT_SYLLABUS = [
  "Quarter 1 — Matter: Properties and Changes",
  "Quarter 1 — Force, Motion, and Energy",
  "Quarter 1 — Energy Sources and Utilization",
  "Quarter 1 — Earth and Space: Geologic Processes",
  "Quarter 2 — Ecosystems and Biodiversity",
  "Quarter 2 — Heredity and Variation",
  "Quarter 2 — Evolution and Adaptation",
  "Quarter 2 — Human Body Systems",
];

export default function DBOWSchedulerPage() {
  const [terms, setTerms] = useState<TermForm[]>(DEFAULT_TERMS);
  const [holidays, setHolidays] = useState<HolidayForm[]>(DEFAULT_HOLIDAYS);
  const [syllabusText, setSyllabusText] = useState(DEFAULT_SYLLABUS.join("\n"));
  const [teachingFrequency, setTeachingFrequency] = useState(5);
  const [learningArea, setLearningArea] = useState("Science");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [rows, setRows] = useState<ScheduleRow[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const updateTerm = (idx: number, patch: Partial<TermForm>) => {
    setTerms((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  };

  const updateHoliday = (idx: number, patch: Partial<HolidayForm>) => {
    setHolidays((prev) => prev.map((h, i) => (i === idx ? { ...h, ...patch } : h)));
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setErrors([]);
    setWarnings([]);
    setRows(null);

    try {
      const payload = {
        learningArea: learningArea || undefined,
        teachingFrequency,
        holidays: holidays
          .filter((h) => h.date.trim())
          .map((h) => ({ date: h.date, name: h.name?.trim() || undefined })),
        terms: terms.map((t) => ({
          name: t.name || `Term ${t.startDate}`,
          startDate: t.startDate,
          endDate: t.endDate,
          examWindows:
            t.examStart && t.examEnd
              ? [{ start: t.examStart, end: t.examEnd }]
              : undefined,
        })),
        syllabus: syllabusText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      };

      const res = await fetch("/api/dbow/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        if (Array.isArray(json.errors)) setErrors(json.errors);
        else setError(json.error || "Failed to generate schedule");
        return;
      }

      setRows(json.rows);
      setWarnings(json.warnings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="h-6 w-6" />
          DBOW Date Allocator
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate non-conflicting target dates for a Definitive Budget of Work from your Master
          Calendar and syllabus. Holidays, exam weeks, and term boundaries are respected.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}
      {errors.length > 0 && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive space-y-1">
          {errors.map((e, i) => (
            <p key={i}>• {e}</p>
          ))}
        </div>
      )}

      {/* Inputs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Master Calendar & Syllabus</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Teaching frequency */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Learning Area / Subject (optional)</Label>
              <Input
                value={learningArea}
                onChange={(e) => setLearningArea(e.target.value)}
                placeholder="e.g., Science"
              />
            </div>
            <div className="space-y-2">
              <Label>Teaching Frequency (days per week)</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={teachingFrequency}
                onChange={(e) => setTeachingFrequency(Number(e.target.value) || 5)}
              />
              <p className="text-xs text-muted-foreground">
                Standard = 5 (Monday–Friday). Use fewer for partial-week subjects.
              </p>
            </div>
          </div>

          {/* Terms */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Terms / Quarters</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setTerms((prev) => [
                    ...prev,
                    { name: `Term ${prev.length + 1}`, startDate: "", endDate: "", examStart: "", examEnd: "" },
                  ])
                }
              >
                <Plus className="h-4 w-4 mr-1" /> Add Term
              </Button>
            </div>
            {terms.map((term, idx) => (
              <div key={idx} className="grid gap-3 rounded-lg border p-3 md:grid-cols-6">
                <div className="space-y-1 md:col-span-1">
                  <Label className="text-xs">Term</Label>
                  <Input value={term.name} onChange={(e) => updateTerm(idx, { name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Start Date</Label>
                  <Input
                    value={isoToReadable(term.startDate)}
                    placeholder="e.g., November 03, 2026"
                    onChange={(e) => updateTerm(idx, { startDate: readableToIso(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End Date</Label>
                  <Input
                    value={isoToReadable(term.endDate)}
                    placeholder="e.g., February 26, 2027"
                    onChange={(e) => updateTerm(idx, { endDate: readableToIso(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Exam Window Start</Label>
                  <Input
                    value={isoToReadable(term.examStart)}
                    placeholder="e.g., February 22, 2027"
                    onChange={(e) => updateTerm(idx, { examStart: readableToIso(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Exam Window End</Label>
                  <Input
                    value={isoToReadable(term.examEnd)}
                    placeholder="e.g., February 26, 2027"
                    onChange={(e) => updateTerm(idx, { examEnd: readableToIso(e.target.value) })}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setTerms((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Holidays */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Holidays, Suspensions & Non-Working Days</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setHolidays((prev) => [...prev, { date: "", name: "" }])}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Holiday
              </Button>
            </div>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {holidays.map((h, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-lg border p-2">
                  <Input
                    className="h-9 w-32 shrink-0 sm:w-40"
                    value={isoToReadable(h.date)}
                    placeholder="e.g., November 01, 2026"
                    onChange={(e) => updateHoliday(idx, { date: readableToIso(e.target.value) })}
                  />
                  <Input
                    className="h-9 min-w-0 flex-1"
                    placeholder="Name (optional)"
                    value={h.name}
                    onChange={(e) => updateHoliday(idx, { name: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive shrink-0"
                    onClick={() => setHolidays((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Syllabus */}
          <div className="space-y-2">
            <Label>Syllabus / Topics (one per line, assigned week-by-week)</Label>
            <textarea
              value={syllabusText}
              onChange={(e) => setSyllabusText(e.target.value)}
              rows={8}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder={"Quarter 1 — Matter\nQuarter 1 — Force, Motion, and Energy\n..."}
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" size="lg" onClick={handleGenerate} disabled={loading}>
              {loading ? (
                <>
                  <Loader size="sm" className="mr-2" />
                  Generating...
                </>
              ) : (
                "Generate DBOW Schedule"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 space-y-1">
          {warnings.map((w, i) => (
            <p key={i}>⚠ {w}</p>
          ))}
        </div>
      )}

      {/* Results */}
      {rows && rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Generated DBOW Schedule
              {learningArea && <Badge variant="secondary" className="ml-2 text-xs">{learningArea}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-medium">Term</th>
                  <th className="px-3 py-2 text-left font-medium">DBOW Week #</th>
                  <th className="px-3 py-2 text-left font-medium">Learning Competency / Module</th>
                  <th className="px-3 py-2 text-left font-medium">Start Date</th>
                  <th className="px-3 py-2 text-left font-medium">End Date</th>
                  <th className="px-3 py-2 text-left font-medium">Teaching Days</th>
                  <th className="px-3 py-2 text-left font-medium">Notes / Exclusions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-3 py-2">{row.term}</td>
                    <td className="px-3 py-2">Week {row.weekNumber}</td>
                    <td className="px-3 py-2 whitespace-normal">{row.competency}</td>
                    <td className="px-3 py-2">{row.startDate}</td>
                    <td className="px-3 py-2">{row.endDate}</td>
                    <td className="px-3 py-2">{row.teachingDays} days</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground whitespace-normal">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}