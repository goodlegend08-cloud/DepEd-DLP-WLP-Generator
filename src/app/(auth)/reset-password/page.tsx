"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  const email = searchParams.get("email") ?? "";
  const token = searchParams.get("token") ?? "";

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !token) {
      setError("This reset link is invalid or has expired. Please request a new one.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/security/forgot/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, newPassword: password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Unable to reset your password. Please try again.");
        setLoading(false);
        return;
      }
      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  if (!email || !token) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {t("resetPassword")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            This reset link is invalid or has expired. Please request a new one.
          </div>
          <Link href="/forgot-password">
            <Button variant="outline">{t("continue")}</Button>
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