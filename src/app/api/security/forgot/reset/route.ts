import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { verifyAnswer } from "@/lib/security-questions-server";
import { MIN_SECURITY_QUESTIONS } from "@/lib/security-questions";

/**
 * Validate security answers and reset the password (public, used by forgot-password).
 *
 * Body: { email, answers: [{ question, answer }], newPassword }
 *
 * Reads the user's stored answer hashes server-side and verifies every provided
 * answer. Only on full match does it reset the password via the admin client
 * (bypasses RLS, requires the service role key).
 */
export async function POST(request: Request) {
  let body: { email?: string; answers?: unknown; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  const answers = Array.isArray(body.answers) ? body.answers : [];

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: "New password must be at least 6 characters" },
      { status: 400 }
    );
  }
  if (answers.length < MIN_SECURITY_QUESTIONS) {
    return NextResponse.json(
      { error: `You must answer at least ${MIN_SECURITY_QUESTIONS} security questions` },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: userId, error: userIdError } = await supabase.rpc("get_user_id_by_email", {
    p_email: email,
  });

  if (userIdError || !userId) {
    // Generic message; do not reveal whether the account exists.
    return NextResponse.json({ error: "Unable to verify security answers" }, { status: 400 });
  }

  // The admin client bypasses RLS so we can read the target user's stored
  // hashes (the caller has no session during forgot-password).
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("security_questions")
    .select("question, answer_hash")
    .eq("user_id", userId);

  if (!rows || rows.length < MIN_SECURITY_QUESTIONS) {
    return NextResponse.json({ error: "Unable to verify security answers" }, { status: 400 });
  }

  // Build a map of provided answers keyed by question.
  const provided = new Map<string, string>();
  for (const a of answers) {
    const question = typeof a?.question === "string" ? a.question.trim() : "";
    const answer = typeof a?.answer === "string" ? a.answer : "";
    if (question) provided.set(question, answer);
  }

  // Verify every stored question's answer.
  for (const row of rows) {
    const answer = provided.get(row.question);
    if (
      typeof answer !== "string" ||
      !verifyAnswer(userId as string, row.question, answer, row.answer_hash)
    ) {
      return NextResponse.json({ error: "Unable to verify security answers" }, { status: 400 });
    }
  }

  // All answers verified: reset the password with the admin (service-role) client.
  const { error: resetError } = await admin.auth.admin.updateUserById(userId as string, {
    password: newPassword,
  });

  if (resetError) {
    return NextResponse.json({ error: resetError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}