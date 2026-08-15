import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Fetch a user's security questions by email (public, used by forgot-password).
 *
 * Runs without an authenticated session, so it relies on the SECURITY DEFINER
 * RPC get_security_questions_by_email which only ever returns question prompts
 * (never answer hashes).
 */
export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_security_questions_by_email", {
    p_email: email,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const questions = (data as string[] | null) ?? [];
  if (questions.length === 0) {
    // Don't leak whether the account exists or lacks questions.
    return NextResponse.json({ questions: [] });
  }

  return NextResponse.json({ questions });
}