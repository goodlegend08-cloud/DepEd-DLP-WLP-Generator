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

export default function GeneratePage() {
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedLessonPlan | GeneratedDLPPlan | WeeklyLessonPlan | null>(null);
  const [currentInput, setCurrentInput] = useState<LessonPlanInput | null>(null);
  const [currentPlanType, setCurrentPlanType] = useState<PlanType>("dlp");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateMeta | null>(null);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [templateDownloading, setTemplateDownloading] = useState(false);
  const [saved, setSaved] = useState(false);
  const { t } = useI18n();

  const handleGenerated = (plan: GeneratedLessonPlan | GeneratedDLPPlan | WeeklyLessonPlan, input: LessonPlanInput) => {
    setGeneratedPlan(plan);
    setCurrentInput(input);
    setCurrentPlanType(input.planType || "dlp");
    setSaved(false);
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

      if (!response.ok) throw new Error("Failed to save");

      setSaved(true);
    } catch {
      alert("Failed to save. Please try again.");
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
              <Save className="mr-2 h-4 w-4" />
              {saved ? t("saved") : saving ? t("loading") : t("savePlan")}
            </Button>
            <Button onClick={handleDownload} disabled={downloading}>
              <Download className="mr-2 h-4 w-4" />
              {downloading ? t("loading") : t("downloadDocx")}
            </Button>
          </div>
        </div>

        {currentPlanType === "wlp" ? (
          <WLPViewer plan={generatedPlan as WeeklyLessonPlan} input={currentInput || undefined} />
        ) : (
          <LessonPlanViewer plan={generatedPlan as GeneratedLessonPlan | GeneratedDLPPlan} input={currentInput || undefined} />
        )}

        <div className="flex justify-center gap-2 pt-4">
          <Button variant="outline" onClick={handleSave} disabled={saving || saved}>
            <Save className="mr-2 h-4 w-4" />
            {saved ? t("saved") : saving ? t("loading") : t("savePlan")}
          </Button>
          <Button onClick={handleDownload} disabled={downloading}>
            <Download className="mr-2 h-4 w-4" />
            {downloading ? t("loading") : t("downloadDocx")}
          </Button>
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
              {templateDownloading ? "Filling template..." : `Download using Template: ${selectedTemplate.name}`}
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
