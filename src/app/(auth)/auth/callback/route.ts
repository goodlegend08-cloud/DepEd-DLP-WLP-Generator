import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { searchParams } = url;
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const token = searchParams.get("token");
  const next = searchParams.get("next") ?? "/dashboard";
  const type = searchParams.get("type");
  const error = searchParams.get("error");
  const errorCode = searchParams.get("error_code");

  // Use the host that served this request so redirects stay on the same
  // deployment the user actually clicked the link on (production, preview,
  // or localhost). getSiteUrl() is client-only and falls back to localhost
  // in route handlers.
  const origin = url.origin;

  // Supabase appends error params when token verification fails
  // (e.g. expired or already-used recovery links). Surface a friendly
  // message instead of a bare landing page.
  if (error || errorCode) {
    if (type === "recovery") {
      return NextResponse.redirect(`${origin}/forgot-password?error=recovery_link_expired`);
    }
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
  }

  const supabase = await createClient();

  // PKCE code flow (newest). Exchange the code for a session.
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (!exchangeError) {
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/reset-password`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("Code exchange error:", exchangeError);
    if (type === "recovery") {
      return NextResponse.redirect(`${origin}/forgot-password?error=recovery_link_expired`);
    }
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
  }

  // token_hash flow (recovery/confirmation links from email templates).
  if (token_hash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as EmailOtpType,
    });
    if (!verifyError) {
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/reset-password`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("Token hash verification error:", verifyError);
    if (type === "recovery") {
      return NextResponse.redirect(`${origin}/forgot-password?error=recovery_link_expired`);
    }
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
  }

  // Legacy token flow (recovery type). Recovery links carry a hashed token
  // that verifyOtp accepts as token_hash.
  if (token && type === "recovery") {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: "recovery",
    });
    if (!verifyError) {
      return NextResponse.redirect(`${origin}/reset-password`);
    }
    console.error("Token verification error:", verifyError);
    return NextResponse.redirect(`${origin}/forgot-password?error=recovery_link_expired`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
