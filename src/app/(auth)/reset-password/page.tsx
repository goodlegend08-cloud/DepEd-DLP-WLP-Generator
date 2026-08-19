"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { Loader } from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShieldCheck, Lock, CheckCircle2 } from "lucide-react";

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

  return (
    <Card className="bg-card/80 shadow-xl backdrop-blur-md">
      <CardHeader className="text-center">
        <div className="mb-3 flex justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
            {success ? <CheckCircle2 className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
          </div>
        </div>
        <CardTitle className="text-2xl font-bold font-sans">
          {success ? t("passwordReset") : t("resetPassword")}
        </CardTitle>
        <CardDescription className="text-sm font-normal leading-tight text-muted-foreground">
          {success ? t("passwordResetSuccess") : "Choose a new password for your account"}
        </CardDescription>
      </CardHeader>

      {!email || !token ? (
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            This reset link is invalid or has expired. Please request a new one.
          </p>
        </CardContent>
      ) : success ? (
        <CardFooter className="justify-center">
          <Button className="w-full" onClick={() => router.push("/login")}>
            {t("login")}
          </Button>
        </CardFooter>
      ) : (
        <form onSubmit={handleResetPassword}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">{t("newPassword")}</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                leadingIcon={<Lock className="h-4 w-4" />}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
              <PasswordInput
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                leadingIcon={<Lock className="h-4 w-4" />}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader size="sm" />
                  {t("loading")}
                </span>
              ) : (
                t("resetPassword")
              )}
            </Button>
            <span className="text-xs text-muted-foreground">
              {t("rememberPassword")}{" "}
              <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                {t("login")}
              </Link>
            </span>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}