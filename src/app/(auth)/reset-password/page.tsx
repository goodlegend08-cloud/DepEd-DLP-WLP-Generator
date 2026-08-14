"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { t } = useI18n();

  useEffect(() => {
    const handleAuth = async () => {
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const token = searchParams.get("token");
      const type = searchParams.get("type");
      const errorParam = searchParams.get("error");

      if (errorParam) {
        setError(
          errorParam === "recovery_link_expired"
            ? "This reset link is invalid or has expired. Please request a new one."
            : "An error occurred. Please try again."
        );
        setValidating(false);
        return;
      }

      // Handle PKCE code flow
      if (code) {
        const { error: authError } = await supabase.auth.exchangeCodeForSession(code);
        if (authError) {
          console.error("Code exchange error:", authError);
          setError("Invalid or expired reset link. Please request a new one.");
          setValidating(false);
          return;
        }
        setHasSession(true);
        setValidating(false);
        return;
      }

      // Handle token_hash flow (recovery links from email templates)
      if (tokenHash && type === "recovery") {
        const { error: authError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });
        if (authError) {
          console.error("Token hash verification error:", authError);
          setError("Invalid or expired reset link. Please request a new one.");
          setValidating(false);
          return;
        }
        setHasSession(true);
        setValidating(false);
        return;
      }

      // Handle older token flow (recovery type). Recovery links carry a
      // hashed token that verifyOtp accepts as token_hash.
      if (token && type === "recovery") {
        const { error: authError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: "recovery",
        });
        if (authError) {
          console.error("Token verification error:", authError);
          setError("Invalid or expired reset link. Please request a new one.");
          setValidating(false);
          return;
        }
        setHasSession(true);
        setValidating(false);
        return;
      }

      // Check if user already has an active session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setHasSession(true);
      }
      setValidating(false);
    };

    handleAuth();
  }, [searchParams, supabase]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    const { error: authError } = await supabase.auth.updateUser({
      password,
    });

    if (authError) {
      console.error("Update user error:", authError);
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (validating) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {t("loading")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            {t("validatingResetLink")}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error && !hasSession) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {t("resetPassword")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
          <Link href="/forgot-password">
            <Button variant="outline">{t("sendResetLink")}</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (success) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {t("passwordReset")}
          </CardTitle>
          <CardDescription>
            {t("passwordResetSuccess")}
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button className="w-full" onClick={() => router.push("/login")}>
            {t("login")}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">
          {t("resetPassword")}
        </CardTitle>
        <CardDescription>
          {t("resetPasswordDesc")}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleResetPassword}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">{t("newPassword")}</Label>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
            <PasswordInput
              id="confirmPassword"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("loading") : t("resetPassword")}
          </Button>
          <p className="text-sm text-muted-foreground">
            {t("rememberPassword")}{" "}
            <Link href="/login" className="text-primary underline">
              {t("login")}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
