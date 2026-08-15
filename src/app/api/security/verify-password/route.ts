import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Verify the current user's password (account-settings protection gate).
 *
 * Body: { password }
 * Used before viewing or updating the security question setup in /account.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!password) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: user.email ?? "",
    password,
  });

  if (error) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}