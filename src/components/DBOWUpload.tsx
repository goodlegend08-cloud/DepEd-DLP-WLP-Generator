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
import { Upload, FileText, Check, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
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
        if (cached.terms.length > 0) {
          setExpandedTerm(cached.terms[0]);
        }
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

      // Auto-expand first term
      if (data.terms.length > 0) {
        setExpandedTerm(data.terms[0]);
      }
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
                <Badge variant="secondary">
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
                <select
                  value={filterContent}
                  onChange={(e) => setFilterContent(e.target.value)}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="all">All Content Areas</option>
                  {dbowData.contentAreas.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
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
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {termGroups.map((termGroup) => {
                const termOpen = expandedTerm === termGroup.term;
                const filteredTopics = termGroup.topics.filter(
                  (topic) =>
                    filterContent === "all" || topic.contentArea === filterContent
                );
                const totalDays = termGroup.topics.reduce(
                  (sum, topic) => sum + topic.entries.length,
                  0
                );

                return (
                  <div key={termGroup.term} className="border rounded-lg">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedTerm(termOpen ? null : termGroup.term)
                      }
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50"
                    >
                      <div>
                        <span className="font-medium text-sm">
                          {termGroup.term}
                        </span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {termGroup.topics.length} units
                        </Badge>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {totalDays} days
                        </Badge>
                      </div>
                      {termOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>

                    {termOpen && (
                      <div className="border-t p-2 space-y-2">
                        {filteredTopics.length === 0 && (
                          <p className="text-sm text-muted-foreground p-2">
                            No topics match the selected filter.
                          </p>
                        )}
                        {filteredTopics.map((topic) => {
                          const topicKey = `${termGroup.term}|||${topic.contentArea}`;
                          const topicOpen = expandedTopic === topicKey;

                          return (
                            <div key={topicKey} className="border rounded-lg">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedTopic(
                                    topicOpen ? null : topicKey
                                  )
                                }
                                className="w-full flex items-center justify-between p-2 text-left hover:bg-muted/50"
                              >
                                <div>
                                  <span className="font-medium text-sm">
                                    {topic.contentArea}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="ml-2 text-xs"
                                  >
                                    {topic.entries.length} days
                                  </Badge>
                                </div>
                                {topicOpen ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </button>

                              {topicOpen && (
                                <div className="border-t p-2 space-y-1">
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
                                        className={`w-full text-left p-2 rounded text-sm flex items-start gap-2 transition-colors ${
                                          isSelected
                                            ? "bg-primary/10 border border-primary"
                                            : "hover:bg-muted/50"
                                        }`}
                                      >
                                        {isSelected && (
                                          <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <Badge
                                              variant="secondary"
                                              className="text-xs"
                                            >
                                              {entry.day}
                                            </Badge>
                                            {entry.dayNumber && (
                                              <span className="text-xs text-muted-foreground">
                                                DBOW Day {entry.dayNumber}
                                              </span>
                                            )}
                                            {entry.date && (
                                              <span className="text-xs text-muted-foreground">
                                                {entry.date}
                                              </span>
                                            )}
                                            <span className="text-xs text-muted-foreground">
                                              {entry.weekRange}
                                            </span>
                                          </div>
                                          <p className="mt-1 text-muted-foreground line-clamp-2">
                                            {entry.objective}
                                          </p>
                                          {entry.competency && (
                                            <p className="mt-1 text-xs text-primary line-clamp-1">
                                              Competency: {entry.competency}
                                            </p>
                                          )}
                                        </div>
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
