"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

export function AuthErrorRedirect() {
  return (
    <Suspense>
      <AuthErrorRedirectInner />
    </Suspense>
  );
}

function AuthErrorRedirectInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;

    const error = searchParams.get("error");
    const errorCode = searchParams.get("error_code");

    if (!error && !errorCode) return;

    handled.current = true;

    router.replace("/login?error=auth_callback_error");
  }, [searchParams, router]);

  return null;
}