"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileText,
  Check,
  ChevronDown,
  Trash2,
  GraduationCap,
  BookOpen,
  CalendarDays,
  Layers,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export interface DBOWEntry {
  term: string;
  contentArea: string;
  weekRange: string;
  weekNumber: string;
  competency: string;
  day: string;
  dayNumber: string;
  objective: string;
  daysTaught: string;
  contentStandard: string;
  performanceStandard: string;
  suggestedActivity: string;
  date: string;
  specificDate?: string;
}

export interface DBOWData {
  rawText: string;
  entries: DBOWEntry[];
  terms: string[];
  contentAreas: string[];
  gradeLevel: string;
  learningArea: string;
}

export interface DBOWMetadata {
  gradeLevel: string;
  learningArea: string;
}

const STORAGE_KEY_PREFIX = "dbow-cached-data";

function storageKeyForUser(userId: string | null): string {
  return userId ? `${STORAGE_KEY_PREFIX}:${userId}` : `${STORAGE_KEY_PREFIX}:anon`;
}

function loadCachedData(userId: string | null): DBOWData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKeyForUser(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.entries) && typeof parsed.rawText === "string") {
      return parsed as DBOWData;
    }
    return null;
  } catch {
    return null;
  }
}

function saveCachedData(userId: string | null, data: DBOWData | null) {
  if (typeof window === "undefined") return;
  try {
    const key = storageKeyForUser(userId);
    if (data) {
      window.localStorage.setItem(key, JSON.stringify(data));
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // localStorage may be unavailable; persistence is a nice-to-have
  }
}

function clearAllCachedData() {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(`${STORAGE_KEY_PREFIX}:`)) {
        keys.push(key);
      }
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // localStorage may be unavailable; persistence is a nice-to-have
  }
}

interface DBOWUploadProps {
  onSelection: (entry: DBOWEntry, rawText: string, metadata: DBOWMetadata) => void;
  onWeekSelection?: (entries: DBOWEntry[], rawText: string, metadata: DBOWMetadata) => void;
  onClear?: () => void;
  selectedEntry: DBOWEntry | null;
  selectedWeekEntries?: DBOWEntry[];
  onParsed?: (data: DBOWData) => void;
  selectionMode?: "day" | "week";
}

function sameEntryKey(a: DBOWEntry, b: DBOWEntry): boolean {
  return (
    (a.term || "") === (b.term || "") &&
    (a.contentArea || "") === (b.contentArea || "") &&
    (a.weekNumber || "") === (b.weekNumber || "") &&
    (a.day || "") === (b.day || "")
  );
}

function termAccent(term: string): { text: string; bg: string } {
  if (/first/i.test(term)) return { text: "text-sky-600", bg: "bg-sky-100" };
  if (/second/i.test(term)) return { text: "text-emerald-600", bg: "bg-emerald-100" };
  if (/third/i.test(term)) return { text: "text-violet-600", bg: "bg-violet-100" };
  return { text: "text-primary", bg: "bg-primary/10" };
}

export function DBOWUpload({ onSelection, onWeekSelection, onClear, selectedEntry, selectedWeekEntries, onParsed, selectionMode = "day" }: DBOWUploadProps) {
  const [dbowData, setDbowData] = useState<DBOWData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [filterContent, setFilterContent] = useState<string>("all");
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const removedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resolve the signed-in user so the DBOW cache is scoped per account,
  // preventing one teacher's DBOW leaking to another account on the browser.
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!cancelled) setUserId(data?.user?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setUserId(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Restore previously uploaded DBOW after hydration to avoid SSR mismatch.
  // Delayed via microtask so the effect doesn't synchronously set state.
  useEffect(() => {
    const cached = loadCachedData(userId);
    if (cached) {
      queueMicrotask(() => {
        if (removedRef.current) return;
        setDbowData(cached);
      });
    }
  }, [userId]);

  const handleUpload = useCallback(async (file: File) => {
    removedRef.current = false;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/dbow/parse", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to parse PDF");
      }

      const data: DBOWData = await response.json();
      setDbowData(data);
      saveCachedData(userId, data);
      onParsed?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse PDF");
    } finally {
      setUploading(false);
    }
  }, [onParsed]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleUpload(file);
      }
      e.target.value = "";
    },
    [handleUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (
        file &&
        (file.type === "application/pdf" ||
          file.type ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          file.name.toLowerCase().endsWith(".docx"))
      ) {
        handleUpload(file);
      }
    },
    [handleUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleRemove = useCallback(() => {
    removedRef.current = true;
    setDbowData(null);
    setFilterContent("all");
    clearAllCachedData();
    setConfirmRemoveOpen(false);
    onClear?.();
  }, [onClear]);

  // Group entries by Term (top level) then content area (nested topics) so
  // each grading period appears exactly once.
  const termGroups = (() => {
    const byTerm: Record<string, Record<string, DBOWEntry[]>> = {};
    (dbowData?.entries || []).forEach((entry) => {
      const term = entry.term || "Unknown Term";
      if (!byTerm[term]) byTerm[term] = {};
      const area = entry.contentArea || "General";
      if (!byTerm[term][area]) byTerm[term][area] = [];
      byTerm[term][area].push(entry);
    });
    return Object.entries(byTerm).map(([term, areas]) => ({
      term,
      topics: Object.entries(areas).map(([contentArea, entries]) => ({
        contentArea,
        entries,
      })),
    }));
  })();

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          DBOW Upload (Optional)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hidden file input (kept mounted so Replace/Clear can re-trigger it) */}
<input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileChange}
              className="hidden"
            />

        {/* Upload Area */}
        {!dbowData && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {uploading
                ? "Parsing file..."
                : "Drop your DBOW PDF or Word document here or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Accepts .pdf or .docx files (DepEd DBOW)
            </p>
          </div>
        )}

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
            {error}
          </div>
        )}

        {/* Parsed Results */}
        {dbowData && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Layers className="h-3 w-3" />
                  {dbowData.entries.length} entries found
                </Badge>
                <Badge variant="outline">
                  {dbowData.terms.length} term(s)
                </Badge>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                  <Check className="h-3 w-3 mr-1" />
                  Saved on this device
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={filterContent}
                  onValueChange={(v) => setFilterContent(v ?? "all")}
                >
                  <SelectTrigger size="sm" className="h-7 px-2 text-xs">
                    <SelectValue placeholder="All Content Areas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Content Areas</SelectItem>
                    {dbowData.contentAreas.map((area) => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmRemoveOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Replace
                </Button>
              </div>
            </div>

            {/* Term Groups */}
            <div className="space-y-3 rounded-xl border bg-muted/20 p-2 max-h-[460px] overflow-y-auto">
              {termGroups.map((termGroup) => {
                const termOpen = expandedTerm === termGroup.term;
                const accent = termAccent(termGroup.term);
                const filteredTopics = termGroup.topics.filter(
                  (topic) =>
                    filterContent === "all" || topic.contentArea === filterContent
                );
                const totalDays = termGroup.topics.reduce(
                  (sum, topic) => sum + topic.entries.length,
                  0
                );

                return (
                  <div
                    key={termGroup.term}
                    className={`overflow-hidden rounded-lg border bg-background transition-colors ${
                      termOpen ? "border-primary/30 shadow-sm" : "border-border"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedTerm(termOpen ? null : termGroup.term)
                      }
                      className={`w-full flex items-center justify-between gap-3 p-3 text-left transition-colors ${
                        termOpen
                          ? `bg-gradient-to-r ${accent.bg}`
                          : "hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accent.bg} ${accent.text}`}
                        >
                          <GraduationCap className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {termGroup.term}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {termGroup.topics.length}{" "}
                            {termGroup.topics.length === 1 ? "unit" : "units"} ·{" "}
                            {totalDays} days
                          </p>
                        </div>
                      </div>
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-background/60 transition-transform duration-200 ${
                          termOpen ? "rotate-180" : ""
                        }`}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </span>
                    </button>

                    {termOpen && (
                      <div className="space-y-2 p-2">
                        {filteredTopics.length === 0 && (
                          <p className="px-2 py-3 text-center text-sm text-muted-foreground">
                            No topics match the selected filter.
                          </p>
                        )}
                        {filteredTopics.map((topic) => {
                          const topicKey = `${termGroup.term}|||${topic.contentArea}`;
                          const topicOpen = expandedTopic === topicKey;

                          return (
                            <div
                              key={topicKey}
                              className="overflow-hidden rounded-lg border border-border/70 bg-muted/20"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedTopic(
                                    topicOpen ? null : topicKey
                                  )
                                }
                                className={`w-full flex items-center justify-between gap-3 px-2.5 py-2 text-left transition-colors ${
                                  topicOpen
                                    ? "bg-background"
                                    : "hover:bg-muted/50"
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <BookOpen
                                    className={`h-4 w-4 shrink-0 ${
                                      topicOpen
                                        ? "text-primary"
                                        : "text-muted-foreground"
                                    }`}
                                  />
                                  <span className="truncate text-sm font-medium">
                                    {topic.contentArea}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {topic.entries.length} days
                                  </Badge>
                                  <ChevronDown
                                    className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                                      topicOpen ? "rotate-180" : ""
                                    }`}
                                  />
                                </div>
                              </button>

                              {topicOpen && (
                                <div className="space-y-1.5 border-t p-2">
                                  {topic.entries.map((entry, idx) => {
                                    const isSelected =
                                      selectionMode === "week"
                                        ? !!selectedWeekEntries?.some((se) =>
                                            sameEntryKey(se, entry)
                                          )
                                        : !!selectedEntry &&
                                          sameEntryKey(selectedEntry, entry);

                                    const handleSelect = () => {
                                      const metadata = {
                                        gradeLevel: dbowData.gradeLevel,
                                        learningArea: dbowData.learningArea,
                                      };

                                      if (selectionMode === "week" && onWeekSelection) {
                                        const isSelectedEntry = !!selectedWeekEntries?.some(
                                          (se) => sameEntryKey(se, entry)
                                        );

                                        if (isSelectedEntry) {
                                          // Unclicking: remove just this topic, keep the rest.
                                          onWeekSelection(
                                            (selectedWeekEntries || []).filter(
                                              (se) => !sameEntryKey(se, entry)
                                            ),
                                            dbowData.rawText,
                                            metadata
                                          );
                                        } else {
                                          // Anchor + auto-select the next 4 consecutive topics,
                                          // ordered by day number across the WHOLE term (not limited
                                          // to the current content-area dropdown group).
                                          const dayNum = (e: DBOWEntry) =>
                                            parseInt(
                                              (e.dayNumber || e.day || "").replace(/\D/g, "") || "0",
                                              10
                                            ) || 0;

                                          const termList = dbowData.entries
                                            .filter((e) => e.term === entry.term)
                                            .slice()
                                            .sort((a, b) => dayNum(a) - dayNum(b));
                                          const anchorIndex = termList.findIndex((e) =>
                                            sameEntryKey(e, entry)
                                          );
                                          const suggested =
                                            anchorIndex >= 0
                                              ? termList.slice(anchorIndex, anchorIndex + 5)
                                              : [entry];
                                          onWeekSelection(suggested, dbowData.rawText, metadata);
                                        }
                                        return;
                                      }

                                      onSelection(entry, dbowData.rawText, metadata);
                                    };

                                    return (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={handleSelect}
                                        className={`w-full rounded-lg border px-2.5 py-2 text-left text-sm transition-all ${
                                          isSelected
                                            ? "border-primary/40 bg-primary/10 shadow-sm"
                                            : "border-transparent hover:border-border hover:bg-background"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          {isSelected && (
                                            <Check className="h-4 w-4 shrink-0 text-primary" />
                                          )}
                                          <Badge
                                            variant={isSelected ? "secondary" : "outline"}
                                            className="shrink-0 text-xs"
                                          >
                                            {entry.day}
                                          </Badge>
                                          {entry.dayNumber && (
                                            <span className="text-xs text-muted-foreground">
                                              DBOW Day {entry.dayNumber}
                                            </span>
                                          )}
                                          {entry.date && (
                                            <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
                                              <CalendarDays className="h-3 w-3" />
                                              {entry.date}
                                            </span>
                                          )}
                                          {entry.weekRange && (
                                            <span className="ml-auto shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                              {entry.weekRange}
                                            </span>
                                          )}
                                        </div>
                                        <p
                                          className={`mt-1.5 line-clamp-2 ${
                                            isSelected
                                              ? "text-foreground"
                                              : "text-muted-foreground"
                                          }`}
                                        >
                                          {entry.objective}
                                        </p>
                                        {entry.competency && (
                                          <p className="mt-1 line-clamp-1 text-xs text-primary">
                                            Competency: {entry.competency}
                                          </p>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={confirmRemoveOpen} onOpenChange={setConfirmRemoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove uploaded DBOW?</DialogTitle>
            <DialogDescription>
              This will remove the uploaded DBOW and its saved data from this
              device. You can upload it again anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemoveOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemove}>
              <Trash2 className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
