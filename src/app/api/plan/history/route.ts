import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    // Filters
    const gradeLevel = searchParams.get("gradeLevel") || "";
    const learningArea = searchParams.get("learningArea") || "";
    const quarter = searchParams.get("quarter") || "";
    const week = searchParams.get("week") || "";
    const planType = searchParams.get("planType") || "";
    const search = searchParams.get("search") || "";

    let query = supabase
      .from("lesson_plans")
      .select("*", { count: "exact" })
      .eq("user_id", user.id);

    if (gradeLevel) {
      query = query.eq("grade_level", gradeLevel);
    }
    if (learningArea) {
      query = query.eq("learning_area", learningArea);
    }
    if (quarter) {
      query = query.eq("quarter", quarter);
    }
    if (week) {
      query = query.eq("week", week);
    }
    if (planType) {
      query = query.eq("plan_type", planType);
    }
    if (search) {
      query = query.or(`competencies.ilike.%${search}%,subject_description.ilike.%${search}%,learning_area.ilike.%${search}%`);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("History error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get unique values for filter options
    const { data: allPlans } = await supabase
      .from("lesson_plans")
      .select("grade_level, learning_area, quarter, week, plan_type")
      .eq("user_id", user.id);

    const filterOptions = {
      gradeLevels: [...new Set((allPlans || []).map((p: any) => p.grade_level).filter(Boolean))],
      learningAreas: [...new Set((allPlans || []).map((p: any) => p.learning_area).filter(Boolean))],
      quarters: [...new Set((allPlans || []).map((p: any) => p.quarter).filter(Boolean))],
      weeks: [...new Set((allPlans || []).map((p: any) => p.week).filter(Boolean))].sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || "0", 10);
        const numB = parseInt(b.match(/\d+/)?.[0] || "0", 10);
        return numA - numB;
      }),
    };

    return NextResponse.json({
      plans: data,
      total: count,
      page,
      limit,
      filterOptions,
    });
  } catch (error) {
    console.error("History error:", error);
    return NextResponse.json(
      { error: "Failed to fetch lesson plans" },
      { status: 500 }
    );
  }
}
