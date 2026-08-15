import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hashAnswer } from "@/lib/security-questions-server";
import {
  MIN_SECURITY_QUESTIONS,
  normalizeAnswer,
  isValidSecurityQuestion,
} from "@/lib/security-questions";

/**
 * Security question management (authenticated).
 *
 * GET  /api/security/questions  -> returns the current user's questions (prompts only)
 * POST /api/security/questions  -> saves/updates the current user's questions.
 *
 * POST accepts { currentPassword?, questions: [{ question, answer }] }.
 * When the user already has security questions set up, currentPassword must be
 * provided and verified so that viewing/updating the security setup requires
 * re-authentication (account-settings protection). First-time setup (e.g. from
 * the forced /security-setup page) doesn't require the password.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("security_questions")
    .select("question")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ questions: data.map((row) => row.question) });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { currentPassword?: string; questions?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const rawQuestions = Array.isArray(body.questions) ? body.questions : [];
  if (rawQuestions.length < MIN_SECURITY_QUESTIONS) {
    return NextResponse.json(
      { error: `You must provide at least ${MIN_SECURITY_QUESTIONS} security questions` },
      { status: 400 }
    );
  }

  const normalized: { question: string; answer: string }[] = [];
  const seen = new Set<string>();
  for (const q of rawQuestions) {
    const question = typeof q?.question === "string" ? q.question.trim() : "";
    const answer = typeof q?.answer === "string" ? q.answer.trim() : "";
    if (!isValidSecurityQuestion(question)) {
      return NextResponse.json({ error: "Invalid security question selected" }, { status: 400 });
    }
    if (!answer) {
      return NextResponse.json({ error: "Every security answer must be filled in" }, { status: 400 });
    }
    if (seen.has(question)) {
      return NextResponse.json({ error: "Security questions must be unique" }, { status: 400 });
    }
    seen.add(question);
    normalized.push({ question, answer });
  }

  // If the user already has questions set up, require password re-authentication
  // before allowing view/update (account-settings protection).
  const { data: existing } = await supabase
    .from("security_questions")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  if (existing && existing.length > 0) {
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    if (!currentPassword) {
      return NextResponse.json(
        { error: "Re-authentication required. Enter your current password." },
        { status: 401 }
      );
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email ?? "",
      password: currentPassword,
    });
    if (signInError) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }
  }

  // Replace all rows with the new set (atomic within a single request).
  const { error: deleteError } = await supabase
    .from("security_questions")
    .delete()
    .eq("user_id", user.id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const rows = normalized.map(({ question, answer }) => ({
    user_id: user.id,
    question,
    answer_hash: hashAnswer(user.id, question, normalizeAnswer(answer)),
  }));

  const { error: insertError } = await supabase.from("security_questions").insert(rows);
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}