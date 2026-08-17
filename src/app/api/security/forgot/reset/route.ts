import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { verifyPasswordResetToken } from "@/lib/security-questions-server";

/**
 * Reset the password using a reset token (Step 4 of the forgot-password flow, public).
 *
 * Body: { email, token, newPassword }
 *
 * The token was issued by /api/security/forgot/verify-answers after the user
 * correctly answered their security questions. It is HMAC-signed and expires
 * after 10 minutes, so the password can be reset without re-verifying answers.
 */
export async function POST(request: Request) {
  let body: { email?: string; token?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  if (!token) {
    return NextResponse.json({ error: "A verification token is required" }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: "New password must be at least 6 characters" },
      { status: 400 }
    );
  }

  // Verify the reset token. It must be valid, unexpired, and bound to this email.
  const tokenEmail = verifyPasswordResetToken(token);
  if (!tokenEmail || tokenEmail !== email) {
    return NextResponse.json(
      { error: "This verification link is invalid or has expired. Please start again." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: userId, error: userIdError } = await supabase.rpc("get_user_id_by_email", {
    p_email: email,
  });

  if (userIdError || !userId) {
    return NextResponse.json(
      { error: "This verification link is invalid or has expired. Please start again." },
      { status: 400 }
    );
  }

  // Reset the password with the admin (service-role) client.
  const admin = createAdminClient();
  const { error: resetError } = await admin.auth.admin.updateUserById(userId as string, {
    password: newPassword,
  });

  if (resetError) {
    return NextResponse.json({ error: resetError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}