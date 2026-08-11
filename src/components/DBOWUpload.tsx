"use client";

import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Check, ChevronDown, ChevronUp } from "lucide-react";

export interface DBOWEntry {
  term: string;
  contentArea: string;
  weekRange: string;
  competency: string;
  day: string;
  objective: string;
  daysTaught: string;
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

interface DBOWUploadProps {
  onSelection: (entry: DBOWEntry, rawText: string, metadata: DBOWMetadata) => void;
  selectedEntry: DBOWEntry | null;
}

export function DBOWUpload({ onSelection, selectedEntry }: DBOWUploadProps) {
  const [dbowData, setDbowData] = useState<DBOWData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null);
  const [filterContent, setFilterContent] = useState<string>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (file: File) => {
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

      // Auto-expand first term
      if (data.terms.length > 0) {
        setExpandedTerm(data.terms[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse PDF");
    } finally {
      setUploading(false);
    }
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleUpload(file);
      }
    },
    [handleUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type === "application/pdf") {
        handleUpload(file);
      }
    },
    [handleUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Group entries by term and content area
  const groupedEntries = dbowData?.entries.reduce(
    (acc, entry) => {
      const key = `${entry.term}|||${entry.contentArea}`;
      if (!acc[key]) {
        acc[key] = {
          term: entry.term,
          contentArea: entry.contentArea,
          entries: [],
        };
      }
      acc[key].entries.push(entry);
      return acc;
    },
    {} as Record<string, { term: string; contentArea: string; entries: DBOWEntry[] }>
  );

  const filteredGroups = Object.values(groupedEntries || {}).filter((group) => {
    if (filterContent === "all") return true;
    return group.contentArea === filterContent;
  });

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          DBOW Upload (Optional)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        {!dbowData && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {uploading
                ? "Parsing PDF..."
                : "Drop your DBOW PDF here or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Accepts .pdf files (DepEd DBOW)
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {dbowData.entries.length} entries found
                </Badge>
                <Badge variant="outline">
                  {dbowData.terms.length} term(s)
                </Badge>
              </div>
              <div className="flex gap-2">
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
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDbowData(null);
                    setFilterContent("all");
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>

            {/* Term Groups */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {filteredGroups.map((group) => {
                const termKey = `${group.term}|||${group.contentArea}`;
                const isExpanded = expandedTerm === termKey;

                return (
                  <div key={termKey} className="border rounded-lg">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedTerm(isExpanded ? null : termKey)
                      }
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50"
                    >
                      <div>
                        <span className="font-medium text-sm">
                          {group.term}
                        </span>
                        <span className="text-muted-foreground text-sm ml-2">
                          — {group.contentArea}
                        </span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {group.entries.length} days
                        </Badge>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="border-t p-2 space-y-1">
                        {group.entries.map((entry, idx) => {
                          const isSelected =
                            selectedEntry?.day === entry.day &&
                            selectedEntry?.objective === entry.objective;

                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() =>
                                onSelection(entry, dbowData.rawText, {
                                  gradeLevel: dbowData.gradeLevel,
                                  learningArea: dbowData.learningArea,
                                })
                              }
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
