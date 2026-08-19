import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = createAdminClient();

  try {
    const [{ count: users }, { count: plansSaved }, { count: plansDlp }, { count: plansWlp }] =
      await Promise.all([
        admin.from("profiles").select("id", { count: "exact", head: true }),
        admin.from("lesson_plans").select("id", { count: "exact", head: true }),
        admin
          .from("lesson_plans")
          .select("id", { count: "exact", head: true })
          .eq("plan_type", "dlp"),
        admin
          .from("lesson_plans")
          .select("id", { count: "exact", head: true })
          .eq("plan_type", "wlp"),
      ]);

    return Response.json({
      users: users ?? 0,
      plansSaved: plansSaved ?? 0,
      plansDlp: plansDlp ?? 0,
      plansWlp: plansWlp ?? 0,
    });
  } catch {
    // Landing-page stats are a nice-to-have; never break the page over them.
    return Response.json({ users: 0, plansSaved: 0, plansDlp: 0, plansWlp: 0 });
  }
}