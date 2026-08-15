"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { getSiteUrl } from "@/lib/site-url";
import {
  SecurityQuestionsField,
  type SecurityQuestionRow,
} from "@/components/security/SecurityQuestionsField";
import { MIN_SECURITY_QUESTIONS } from "@/lib/security-questions";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityRows, setSecurityRows] = useState<SecurityQuestionRow[]>([
    { question: "", answer: "" },
    { question: "", answer: "" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { t } = useI18n();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    // Validate security questions before creating the account.
    const answered = securityRows.filter((r) => r.question && r.answer.trim());
    if (answered.length < MIN_SECURITY_QUESTIONS) {
      setError(`Please select and answer at least ${MIN_SECURITY_QUESTIONS} security questions.`);
      return;
    }

    setLoading(true);

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/dashboard`,
      },
    });

    if (authError) {
      setError(
        authError.message ||
          "Sign up failed. Please check your email and try again, or contact your administrator."
      );
      setLoading(false);
      return;
    }

    // If email confirmation is disabled, the session is created immediately and
    // we can persist the security questions right away.
    if (data.session) {
      const saveRes = await fetch("/api/security/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: answered.map(({ question, answer }) => ({ question, answer })),
        }),
      });

      if (saveRes.ok) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      // Question save failed (e.g. missing SECURITY_QUESTION_SECRET). The
      // middleware guard will redirect to /security-setup on next navigation,
      // so landing on the dashboard here is acceptable.
      console.error("Failed to save security questions:", await saveRes.text());
      router.replace("/");
      router.refresh();
      return;
    }

    // Email confirmation enabled: no session yet. The middleware guard will
    // force security question setup on the first login.
    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Check your email
          </CardTitle>
          <CardDescription>
            We sent a confirmation link to <strong>{email}</strong>. Please check your inbox and verify your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            After confirming your email, you&apos;ll be asked to set up your security questions before accessing the app.
          </p>
        </CardContent>
        <CardFooter>
          <Link href="/login" className="w-full">
            <Button className="w-full" variant="outline">
              {t("login")}
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">
          {t("signup")}
        </CardTitle>
        <CardDescription>
          DepEd Auto-DLP/DLL Generator
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSignup}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="fullName">{t("fullName")}</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Juan Dela Cruz"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder="teacher@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
          <div className="space-y-2">
            <Label>Security Questions</Label>
            <p className="text-sm text-muted-foreground">
              Choose at least {MIN_SECURITY_QUESTIONS} questions you can remember. You&apos;ll need
              them to reset your password without email.
            </p>
            <SecurityQuestionsField value={securityRows} onChange={setSecurityRows} />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("loading") : t("signup")}
          </Button>
          <p className="text-sm text-muted-foreground">
            {t("alreadyHaveAccount")}{" "}
            <Link href="/login" className="text-primary underline">
              {t("login")}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}