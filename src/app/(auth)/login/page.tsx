"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Loader } from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

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
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">{t("login")}</CardTitle>
        <CardDescription>Welcome back to DepEd Auto-DLP/DLL</CardDescription>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder="teacher@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("password")}</Label>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader size="sm" />
                {t("loading")}
              </span>
            ) : (
              t("login")
            )}
          </Button>
          <div className="flex flex-col items-center space-y-2">
            <Link href="/forgot-password" className="text-sm text-primary underline">
              {t("forgotPassword")}
            </Link>
            <span className="text-sm text-muted-foreground">
              {t("noAccount")}{" "}
              <Link href="/signup" className="text-primary underline">
                {t("signup")}
              </Link>
            </span>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}