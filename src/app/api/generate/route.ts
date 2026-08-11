import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateLessonPlan } from "@/lib/gemini";
import { buildSystemPrompt, buildUserPrompt, buildWLPSystemPrompt, buildWLPUserPrompt } from "@/lib/prompts";
import type { LessonPlanInput, GeneratedLessonPlan, GeneratedDLPPlan, WeeklyLessonPlan, PlanType } from "@/types/lesson-plan";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const input: LessonPlanInput = await request.json();

    // Validate required fields
    if (!input.gradeLevel || !input.learningArea || !input.quarter || !input.week) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const planType: PlanType = input.planType || "dlp";

    let systemPrompt: string;
    let userPrompt: string;

    if (planType === "wlp") {
      systemPrompt = buildWLPSystemPrompt(
        input.curriculumType,
        input.teachingMethod,
        input.teachingMethodCustom
      );
      userPrompt = buildWLPUserPrompt({
        gradeLevel: input.gradeLevel,
        learningArea: input.learningArea,
        quarter: input.quarter,
        week: input.week,
        subjectDescription: input.subjectDescription,
        competencies: input.competencies,
        coiTags: input.coiTags,
      });
    } else {
      systemPrompt = buildSystemPrompt(
        input.curriculumType,
        input.teachingMethod,
        input.teachingMethodCustom
      );
      userPrompt = buildUserPrompt({
        gradeLevel: input.gradeLevel,
        learningArea: input.learningArea,
        quarter: input.quarter,
        week: input.week,
        subjectDescription: input.subjectDescription,
        competencies: input.competencies,
        coiTags: input.coiTags,
        teacherName: input.teacherName,
        schoolName: input.schoolName,
        dayNumber: input.dayNumber,
        calendarDate: input.calendarDate,
      });
    }

    const rawResponse = await generateLessonPlan(systemPrompt, userPrompt, user.id);

    // Parse JSON response - strip markdown code fences if present
    let cleanedResponse = rawResponse.trim();
    if (cleanedResponse.startsWith("```json")) {
      cleanedResponse = cleanedResponse.slice(7);
    }
    if (cleanedResponse.startsWith("```")) {
      cleanedResponse = cleanedResponse.slice(3);
    }
    if (cleanedResponse.endsWith("```")) {
      cleanedResponse = cleanedResponse.slice(0, -3);
    }
    cleanedResponse = cleanedResponse.trim();

    if (planType === "wlp") {
      const weeklyPlan: WeeklyLessonPlan = JSON.parse(cleanedResponse);

      if (
        !weeklyPlan.monday ||
        !weeklyPlan.tuesday ||
        !weeklyPlan.wednesday ||
        !weeklyPlan.thursday ||
        !weeklyPlan.friday ||
        !weeklyPlan.weeklyObjectives
      ) {
        return NextResponse.json(
          { error: "Invalid WLP response structure from AI" },
          { status: 500 }
        );
      }

      return NextResponse.json({ lessonPlan: weeklyPlan, planType: "wlp" });
    } else {
      const parsed = JSON.parse(cleanedResponse);

      // Check if it's the new ILAW format (has header, lesson_plan_meta, intentions)
      if (parsed.header && parsed.lesson_plan_meta && parsed.intentions) {
        const dlpPlan: GeneratedDLPPlan = parsed;

        if (
          !dlpPlan.header ||
          !dlpPlan.lesson_plan_meta ||
          !dlpPlan.intentions ||
          !dlpPlan.learning_experience ||
          !dlpPlan.assessment ||
          !dlpPlan.ways_forward ||
          !dlpPlan.signatories
        ) {
          return NextResponse.json(
            { error: "Invalid DLP response structure from AI" },
            { status: 500 }
          );
        }

        // Normalize: ensure nested flow object exists
        if (!dlpPlan.learning_experience.flow) {
          dlpPlan.learning_experience.flow = {
            engage: dlpPlan.learning_experience.engage || "",
            explore_explain_modeling: dlpPlan.learning_experience.explore_explain_modeling || "",
            elaborate_guided_practice: dlpPlan.learning_experience.elaborate_guided_practice || "",
            evaluate_independent_practice: dlpPlan.learning_experience.evaluate_independent_practice || "",
            reflection_closure: dlpPlan.learning_experience.reflection_closure || "",
          };
        }

        // Normalize: ensure nested formative_assessment object exists
        if (!dlpPlan.assessment.formative_assessment) {
          dlpPlan.assessment.formative_assessment = {
            frustration: dlpPlan.assessment.formative_assessment_frustration || "",
            instructional: dlpPlan.assessment.formative_assessment_instructional || "",
            independent: dlpPlan.assessment.formative_assessment_independent || "",
          };
        }

        // Normalize: ensure nested extended_learning object exists
        if (!dlpPlan.ways_forward.extended_learning) {
          dlpPlan.ways_forward.extended_learning = {
            advanced: dlpPlan.ways_forward.extended_learning_advanced || "",
            struggling: dlpPlan.ways_forward.extended_learning_struggling || "",
          };
        }

        return NextResponse.json({ lessonPlan: dlpPlan, planType: "dlp" });
      }

      // Fallback: check for old format
      const lessonPlan: GeneratedLessonPlan = parsed;

      if (
        !lessonPlan.objectives ||
        !lessonPlan.content ||
        !lessonPlan.learning_resources ||
        !lessonPlan.procedures ||
        !lessonPlan.remarks ||
        !lessonPlan.reflection
      ) {
        return NextResponse.json(
          { error: "Invalid DLP response structure from AI" },
          { status: 500 }
        );
      }

      return NextResponse.json({ lessonPlan, planType: "dlp" });
    }
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate lesson plan" },
      { status: 500 }
    );
  }
}
