import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Server-side token exchange endpoint used by confirmation email templates.
// The template points here with a token_hash query param:
//
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/dashboard
//
// Unlike the PKCE code flow, token_hash links work regardless of which
// browser/device opened the email (no code verifier cookie required).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const { searchParams } = url;
  const token_hash = searchParams.get("token_hash");
  const next = searchParams.get("next") ?? "/dashboard";
  const type = searchParams.get("type");
  const error = searchParams.get("error");
  const errorCode = searchParams.get("error_code");

  // Use the host that served this request so redirects stay on the same
  // deployment the user actually clicked the link on (production, preview,
  // or localhost).
  const origin = url.origin;

  // Supabase appends error params when token verification fails
  // (e.g. expired or already-used confirmation links). Surface a friendly
  // message instead of a bare landing page.
  if (error || errorCode) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
  }

  const supabase = await createClient();

  // token_hash flow (recommended for email templates).
  if (token_hash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as EmailOtpType,
    });
    if (!verifyError) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("Token hash verification error:", verifyError);
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}