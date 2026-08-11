import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildDocx, buildWLPDocx } from "@/lib/docx-builder";
import type { GeneratedLessonPlan, GeneratedDLPPlan, WeeklyLessonPlan, LessonPlanInput, PlanType } from "@/types/lesson-plan";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan, input, planType } = (await request.json()) as {
      plan: GeneratedLessonPlan | GeneratedDLPPlan | WeeklyLessonPlan;
      input: LessonPlanInput;
      planType?: PlanType;
    };

    if (!plan || !input) {
      return NextResponse.json(
        { error: "Missing plan or input data" },
        { status: 400 }
      );
    }

    const type = planType || input.planType || "dlp";
    let buffer: Buffer;

    if (type === "wlp") {
      buffer = await buildWLPDocx(plan as WeeklyLessonPlan, input);
    } else {
      buffer = await buildDocx(plan as GeneratedDLPPlan, input);
    }

    const prefix = type === "wlp" ? "WLP" : "DLP";
    const filename = `${prefix}_${input.learningArea.replace(/\s+/g, "_")}_${input.gradeLevel.replace(/\s+/g, "_")}_${input.quarter.replace(/\s+/g, "_")}_${input.week.replace(/\s+/g, "_")}.docx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export document" },
      { status: 500 }
    );
  }
}
