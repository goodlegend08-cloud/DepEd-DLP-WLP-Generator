import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protect dashboard, generate, plan, and scheduler routes
  const isProtectedRoute = pathname.startsWith("/dashboard") ||
    pathname.startsWith("/generate") ||
    pathname.startsWith("/plan") ||
    pathname.startsWith("/scheduler") ||
    pathname.startsWith("/account");

  const isSecuritySetupRoute = pathname === "/security-setup" || pathname.startsWith("/security-setup/");

  if (!user && (isProtectedRoute || isSecuritySetupRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from auth pages
  const isAuthRoute = pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password";

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // /reset-password requires a reset state (email + token issued by the
  // verify-answers step). Without it, unauthenticated users can't reach the
  // password reset form. The token signature is verified by the reset API.
  if (!user && pathname === "/reset-password") {
    const email = request.nextUrl.searchParams.get("email");
    const token = request.nextUrl.searchParams.get("token");
    if (!email || !token) {
      const url = request.nextUrl.clone();
      url.pathname = "/forgot-password";
      return NextResponse.redirect(url);
    }
  }

  // Security-question guard: authenticated users who haven't completed security
  // question setup are blocked from the main app and forced to /security-setup.
  if (user) {
    const { data: hasQuestions } = await supabase
      .from("security_questions")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    const questionsExist = Array.isArray(hasQuestions) && hasQuestions.length > 0;

    if (isSecuritySetupRoute && questionsExist) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    if (isProtectedRoute && !questionsExist) {
      const url = request.nextUrl.clone();
      url.pathname = "/security-setup";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
