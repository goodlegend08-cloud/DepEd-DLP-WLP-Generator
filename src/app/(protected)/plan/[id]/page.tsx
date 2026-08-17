"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { LessonPlanViewer } from "@/components/LessonPlanViewer";
import { WLPViewer } from "@/components/WLPViewer";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/Loader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { ArrowLeft, Download, Trash2 } from "lucide-react";
import type { SavedLessonPlan, GeneratedLessonPlan, GeneratedDLPPlan, LessonPlanInput, TeachingMethod, PlanType } from "@/types/lesson-plan";

export default function PlanDetailPage() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams();
  const planId = params.id as string;

  const [plan, setPlan] = useState<SavedLessonPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const fetchPlan = useCallback(async () => {
    try {
      const res = await fetch(`/api/plan/${planId}`);
      if (!res.ok) {
        setError("Plan not found");
        return;
      }
      const data = await res.json();
      setPlan(data.plan);
    } catch {
      setError("Failed to load plan");
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const handleDownload = async () => {
    if (!plan) return;
    setDownloading(true);

  const input: LessonPlanInput = {
    gradeLevel: plan.grade_level,
    learningArea: plan.learning_area,
    quarter: plan.quarter,
    week: plan.week,
    subjectDescription: plan.subject_description,
    curriculumType: plan.curriculum_type,
    teachingMethod: plan.teaching_method as TeachingMethod,
    teachingMethodCustom: plan.teaching_method_custom ?? undefined,
    competencies: plan.competencies,
    coiTags: plan.coi_tags ?? undefined,
    planType: (plan.plan_type as PlanType) || "dlp",
  };

  try {
    const res = await fetch("/api/export/docx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan: plan.generated_content,
        input,
        planType: plan.plan_type,
      }),
    });

      if (!res.ok) throw new Error("Failed to download");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DLL_${plan.learning_area.replace(/\s+/g, "_")}_${plan.grade_level.replace(/\s+/g, "_")}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to download. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/plan/${planId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      router.push("/dashboard");
    } catch {
      alert("Failed to delete. Please try again.");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-muted-foreground">{error || t("noPlans")}</p>
        <Button variant="ghost" onClick={() => router.push("/dashboard")} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("dashboard")}
        </Button>
      </div>
    );
  }

  const planInput: LessonPlanInput = {
    gradeLevel: plan.grade_level,
    learningArea: plan.learning_area,
    quarter: plan.quarter,
    week: plan.week,
    subjectDescription: plan.subject_description,
    curriculumType: plan.curriculum_type,
    teachingMethod: plan.teaching_method as TeachingMethod,
    teachingMethodCustom: plan.teaching_method_custom ?? undefined,
    competencies: plan.competencies,
    coiTags: plan.coi_tags ?? undefined,
    planType: (plan.plan_type as PlanType) || "dlp",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/dashboard")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("dashboard")}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownload} disabled={downloading}>
            {downloading ? <Loader size="sm" /> : <Download className="mr-2 h-4 w-4" />}
            {downloading ? t("loading") : t("downloadDocx")}
          </Button>
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            {t("deletePlan")}
          </Button>
        </div>
      </div>

      {plan.plan_type === "wlp" ? (
        <WLPViewer plan={plan.generated_content as any} input={planInput} />
      ) : (
        <LessonPlanViewer plan={plan.generated_content as GeneratedLessonPlan | GeneratedDLPPlan} input={planInput} />
      )}

      <div className="flex justify-center gap-2 pt-4 pb-8">
        <Button variant="outline" onClick={handleDownload} disabled={downloading}>
          {downloading ? <Loader size="sm" /> : <Download className="mr-2 h-4 w-4" />}
          {downloading ? t("loading") : t("downloadDocx")}
        </Button>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deletePlan")}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this lesson plan? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              {t("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <span className="flex items-center gap-2"><Loader size="sm" />{t("loading")}</span> : t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
