"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Trash2, Check } from "lucide-react";
import { Loader } from "@/components/Loader";
import type { TemplateMeta } from "@/lib/template-processor";

interface TemplateUploadProps {
  selectedTemplateId: string | null;
  onSelectTemplate: (template: TemplateMeta | null) => void;
}

export function TemplateUpload({
  selectedTemplateId,
  onSelectTemplate,
}: TemplateUploadProps) {
  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/templates/list");
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch {
      setError("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("name", uploadName || uploadFile.name.replace(/\.docx$/i, ""));
      formData.append("description", uploadDescription);

      const res = await fetch("/api/templates/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Upload failed");
      }

      // Reset form
      setUploadFile(null);
      setUploadName("");
      setUploadDescription("");

      // Reload templates
      await loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Upload new template */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload DLP Template (.docx)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Upload a .docx file with placeholders like{" "}
            <code className="bg-muted px-1 rounded">{`{{CALENDAR_DATE}}`}</code>,{" "}
            <code className="bg-muted px-1 rounded">{`{{TEACHER_NAME}}`}</code>, etc.
            The original file will never be modified — a copy is made and filled.
          </p>

          <div className="space-y-2">
            <Label htmlFor="template-file" className="text-xs">
              Select .docx file
            </Label>
            <Input
              id="template-file"
              type="file"
              accept=".docx"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-name" className="text-xs">
              Template Name (optional)
            </Label>
            <Input
              id="template-name"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              placeholder="e.g., Science 9 ILAW Template"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-desc" className="text-xs">
              Description (optional)
            </Label>
            <Textarea
              id="template-desc"
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              placeholder="e.g., Official DepEd ILAW format for Science 9"
              rows={2}
            />
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleUpload}
            disabled={!uploadFile || uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader size="sm" className="mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-3 w-3" />
                Upload Template
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Available templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Available Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader size="sm" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No templates uploaded yet. Upload a .docx template above.
            </p>
          ) : (
            <div className="space-y-2">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className={`flex items-center justify-between p-2 rounded-md border cursor-pointer transition-colors ${
                    selectedTemplateId === tpl.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() =>
                    onSelectTemplate(
                      selectedTemplateId === tpl.id ? null : tpl
                    )
                  }
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">
                        {tpl.name}
                      </span>
                      {selectedTemplateId === tpl.id && (
                        <Badge
                          variant="default"
                          className="h-5 text-[10px] px-1.5"
                        >
                          <Check className="h-3 w-3 mr-0.5" />
                          Selected
                        </Badge>
                      )}
                    </div>
                    {tpl.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {tpl.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}