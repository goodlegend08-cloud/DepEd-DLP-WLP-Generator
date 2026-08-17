"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const ERROR_MESSAGES: Record<string, string> = {
  auth_callback_error: "Email confirmation failed. The link may have expired or already been used. Please try signing up again.",
  email_not_confirmed: "Please confirm your email before logging in. Check your inbox (and spam folder) for the confirmation link.",
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { t } = useI18n();

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      queueMicrotask(() => {
        setError(ERROR_MESSAGES[errorParam] || "An error occurred. Please try again.");
      });
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      const message =
        authError.message === "Email not confirmed"
          ? "Email not confirmed. Please check your inbox (and spam folder) for the confirmation link."
          : authError.message;
      setError(message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <form className="auth-card" onSubmit={handleLogin}>
      <span className="auth-singup">{t("login")}</span>

      {error && <p className="auth-msg">{error}</p>}

      <div className="auth-inputBox">
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <span>{t("email")}</span>
      </div>

      <div className="auth-inputBox">
        <input
          id="password"
          type={show ? "text" : "password"}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <span>{t("password")}</span>
        <button
          type="button"
          className="auth-eye"
          onClick={() => setShow((prev) => !prev)}
          aria-label={show ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>

      <button type="submit" className="auth-enter" disabled={loading}>
        {loading ? t("loading") : t("login")}
      </button>

      <div className="auth-row">
        <Link href="/forgot-password" className="auth-link">
          {t("forgotPassword")}
        </Link>
        <span className="text-xs text-black/70">
          {t("noAccount")}{" "}
          <Link href="/signup" className="auth-link">
            {t("signup")}
          </Link>
        </span>
      </div>
    </form>
  );
}