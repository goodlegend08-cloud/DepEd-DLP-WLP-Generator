import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure a profiles row exists for this user (lesson_plans.user_id
    // references profiles.id). Accounts created before the signup trigger
    // was installed may be missing their profile. Uses the service-role
    // client so it works regardless of RLS policies on profiles.
    const { error: profileError } = await createAdminClient()
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email ?? "",
          full_name:
            (user.user_metadata?.full_name as string | undefined) ?? "",
        },
        { onConflict: "id" }
      );
    if (profileError) {
      console.error("Profile upsert error:", profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const body = await request.json();
    const {
      gradeLevel,
      learningArea,
      quarter,
      week,
      subjectDescription,
      curriculumType,
      teachingMethod,
      teachingMethodCustom,
      competencies,
      coiTags,
      planType,
      generatedContent,
    } = body;

    const { data, error } = await supabase
      .from("lesson_plans")
      .insert({
        user_id: user.id,
        grade_level: gradeLevel,
        learning_area: learningArea,
        quarter,
        week,
        subject_description: subjectDescription || "",
        curriculum_type: curriculumType,
        teaching_method: teachingMethod,
        teaching_method_custom: teachingMethodCustom || null,
        competencies: competencies || "",
        coi_tags: coiTags || null,
        plan_type: planType || "dlp",
        generated_content: generatedContent,
      })
      .select()
      .single();

    if (error) {
      console.error("Save error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ plan: data });
  } catch (error) {
    console.error("Save error:", error);
    return NextResponse.json(
      { error: "Failed to save lesson plan" },
      { status: 500 }
    );
  }
}
