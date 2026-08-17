import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { verifyAnswer } from "@/lib/security-questions-server";
import { createPasswordResetToken } from "@/lib/security-questions-server";
import { MIN_SECURITY_QUESTIONS } from "@/lib/security-questions";

/**
 * Verify security answers (Step 2 of the forgot-password flow, public).
 *
 * Body: { email, answers: [{ question, answer }] }
 *
 * Reads the user's stored answer hashes server-side and verifies every provided
 * answer. On full match it issues a short-lived reset token that authorizes the
 * /reset-password form to call /api/security/forgot/reset.
 */
export async function POST(request: Request) {
  let body: { email?: string; answers?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const answers = Array.isArray(body.answers) ? body.answers : [];

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
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

  // All answers verified: issue a short-lived reset token.
  const { token, expiresAt } = createPasswordResetToken(email);

  return NextResponse.json({ ok: true, token, expiresAt });
}