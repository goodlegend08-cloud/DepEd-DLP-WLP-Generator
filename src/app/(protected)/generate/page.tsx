"use client";

import { useState } from "react";
import { LessonPlanForm } from "@/components/forms/LessonPlanForm";
import { LessonPlanViewer } from "@/components/LessonPlanViewer";
import { WLPViewer } from "@/components/WLPViewer";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { Download, Save, ArrowLeft, FileText } from "lucide-react";
import { planToPlaceholderValues } from "@/lib/plan-to-placeholders";
import type { TemplateMeta } from "@/lib/template-processor";
import type { LessonPlanInput, GeneratedLessonPlan, GeneratedDLPPlan, WeeklyLessonPlan, PlanType } from "@/types/lesson-plan";
import { Loader } from "@/components/Loader";

export default function GeneratePage() {
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedLessonPlan | GeneratedDLPPlan | WeeklyLessonPlan | null>(null);
  const [currentInput, setCurrentInput] = useState<LessonPlanInput | null>(null);
  const [currentPlanType, setCurrentPlanType] = useState<PlanType>("dlp");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateMeta | null>(null);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [templateDownloading, setTemplateDownloading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [aiInfo, setAiInfo] = useState<{ provider?: string; model?: string } | null>(null);
  const { t } = useI18n();

  const handleGenerated = (plan: GeneratedLessonPlan | GeneratedDLPPlan | WeeklyLessonPlan, input: LessonPlanInput, generatedMeta?: { provider?: string; model?: string }) => {
    setGeneratedPlan(plan);
    setCurrentInput(input);
    setCurrentPlanType(input.planType || "dlp");
    setAiInfo(generatedMeta || null);
    setSaved(false);
  };

  /** Update a nested field of the generated plan via a dot-path key. */
  const handleEditPlan = (key: string, value: string) => {
    setGeneratedPlan((prev) => {
      if (!prev) return prev;
      const clone = structuredClone(prev as unknown) as Record<string, unknown>;
      const parts = key.split(".");
      let target: Record<string, unknown> = clone;
      for (let i = 0; i < parts.length - 1; i++) {
        const segment = parts[i];
        const next = target[segment];
        if (!next || typeof next !== "object" || Array.isArray(next)) {
          target[segment] = {};
        }
        target = target[segment] as Record<string, unknown>;
      }
      target[parts[parts.length - 1]] = value;
      setSaved(false);
      return clone as unknown as GeneratedLessonPlan | GeneratedDLPPlan | WeeklyLessonPlan;
    });
  };

  const handleTemplateSelect = (template: TemplateMeta | null) => {
    setSelectedTemplate(template);
  };

  const isILAWPlan = (plan: GeneratedLessonPlan | GeneratedDLPPlan | WeeklyLessonPlan): plan is GeneratedDLPPlan => {
    return "header" in plan && "lesson_plan_meta" in plan && "intentions" in plan;
  };

  const handleTemplateDownload = async () => {
    if (!generatedPlan || !currentInput || !selectedTemplate) return;
    if (!isILAWPlan(generatedPlan)) {
      alert("Template filling is only supported for DLP plans (ILAW format).");
      return;
    }

    setTemplateDownloading(true);
    try {
      const values = planToPlaceholderValues(generatedPlan);
      const response = await fetch("/api/export/template-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          values,
          outputFilename: `DLP_${currentInput.learningArea.replace(/\s+/g, "_")}_${currentInput.calendarDate || "date"}.docx`,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to fill template");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DLP_${selectedTemplate.name.replace(/\s+/g, "_")}_filled.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to download using template");
    } finally {
      setTemplateDownloading(false);
    }
  };

  const handleSave = async () => {
    if (!generatedPlan || !currentInput) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);

    try {
      const response = await fetch("/api/plan/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gradeLevel: currentInput.gradeLevel,
          learningArea: currentInput.learningArea,
          quarter: currentInput.quarter,
          week: currentInput.week,
          subjectDescription: currentInput.subjectDescription,
          curriculumType: currentInput.curriculumType,
          teachingMethod: currentInput.teachingMethod,
          teachingMethodCustom: currentInput.teachingMethodCustom,
          competencies: currentInput.competencies,
          coiTags: currentInput.coiTags,
          planType: currentPlanType,
          generatedContent: generatedPlan,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || "Failed to save");
      }

      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedPlan || !currentInput) return;
    setDownloading(true);

    try {
      // If a template is selected and the plan is an ILAW DLP, use template fill
      if (selectedTemplate && isILAWPlan(generatedPlan)) {
        const values = planToPlaceholderValues(generatedPlan);
        const response = await fetch("/api/export/template-docx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: selectedTemplate.id,
            values,
            outputFilename: `DLP_${currentInput.learningArea.replace(/\s+/g, "_")}_${currentInput.calendarDate || "date"}.docx`,
          }),
        });

        if (!response.ok) throw new Error("Failed to download using template");

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `DLP_${selectedTemplate.name.replace(/\s+/g, "_")}_filled.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Fall back to programmatic DOCX generation
        const response = await fetch("/api/export/docx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: generatedPlan, input: currentInput, planType: currentPlanType }),
        });

        if (!response.ok) throw new Error("Failed to download");

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const prefix = currentPlanType === "wlp" ? "WLP" : "DLL";
        a.download = `${prefix}_${currentInput.learningArea.replace(/\s+/g, "_")}_${currentInput.gradeLevel.replace(/\s+/g, "_")}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {
      alert("Failed to download. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  if (generatedPlan) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setGeneratedPlan(null)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Form
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSave} disabled={saving || saved}>
              {saving ? <Loader size="sm" /> : <Save className="mr-2 h-4 w-4" />}
              {saved ? t("saved") : saving ? t("loading") : t("savePlan")}
            </Button>
            <Button onClick={handleDownload} disabled={downloading}>
              {downloading ? <Loader size="sm" /> : <Download className="mr-2 h-4 w-4" />}
              {downloading ? t("loading") : t("downloadDocx")}
            </Button>
          </div>
        </div>

        {currentPlanType === "wlp" ? (
          <WLPViewer plan={generatedPlan as WeeklyLessonPlan} input={currentInput || undefined} onEdit={handleEditPlan} />
        ) : (
          <LessonPlanViewer plan={generatedPlan as GeneratedLessonPlan | GeneratedDLPPlan} input={currentInput || undefined} onEdit={handleEditPlan} />
        )}

        {saveError && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            Save failed: {saveError}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
          <Button variant="outline" onClick={handleSave} disabled={saving || saved}>
            {saving ? <Loader size="sm" /> : <Save className="mr-2 h-4 w-4" />}
            {saved ? t("saved") : saving ? t("loading") : t("savePlan")}
          </Button>
          <Button onClick={handleDownload} disabled={downloading}>
            {downloading ? <Loader size="sm" /> : <Download className="mr-2 h-4 w-4" />}
            {downloading ? t("loading") : t("downloadDocx")}
          </Button>
          {aiInfo && (
            <span className="print:hidden text-xs text-muted-foreground">
              Generated with {aiInfo.model || aiInfo.provider}
            </span>
          )}
        </div>

        {/* Template download button (visible when plan is ILAW format and a template is selected) */}
        {selectedTemplate && currentPlanType === "dlp" && isILAWPlan(generatedPlan) && (
          <div className="flex justify-center pt-2">
            <Button
              variant="secondary"
              onClick={handleTemplateDownload}
              disabled={templateDownloading}
              className="w-full max-w-md"
            >
              <FileText className="mr-2 h-4 w-4" />
              {templateDownloading ? <span className="flex items-center gap-2"><Loader size="sm" />Filling template...</span> : `Download using Template: ${selectedTemplate.name}`}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t("generate")}</h1>
      <LessonPlanForm onGenerated={handleGenerated} onTemplateSelect={handleTemplateSelect} />
    </div>
  );
}
