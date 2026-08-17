"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Loader } from "@/components/Loader";
import { getSiteUrl } from "@/lib/site-url";
import {
  SecurityQuestionsField,
  type SecurityQuestionRow,
} from "@/components/security/SecurityQuestionsField";
import { MIN_SECURITY_QUESTIONS } from "@/lib/security-questions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [stepLeaving, setStepLeaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityRows, setSecurityRows] = useState<SecurityQuestionRow[]>([
    { question: "", answer: "" },
    { question: "", answer: "" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { t } = useI18n();

  // Validate Step 1 (account details) then advance to Step 2.
  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setShakeKey((k) => k + 1);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setShakeKey((k) => k + 1);
      return;
    }

    advanceStep(2);
  };

  // Animate exit of the current step, then switch to the next one.
  const advanceStep = (next: number) => {
    setStepLeaving(true);
    window.setTimeout(() => {
      setStep(next);
      setStepLeaving(false);
    }, 150);
  };

  // Validate Step 2 (security questions) then create the account.
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validate security questions before creating the account.
    const answered = securityRows.filter((r) => r.question && r.answer.trim());
    if (answered.length < MIN_SECURITY_QUESTIONS) {
      setError(`Please select and answer at least ${MIN_SECURITY_QUESTIONS} security questions.`);
      setShakeKey((k) => k + 1);
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
      setShakeKey((k) => k + 1);
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
      <div className="auth-motion-card">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">{t("signup")}</CardTitle>
            <CardDescription>Check your email</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-center text-sm text-muted-foreground">
            <p>
              We sent a confirmation link to <strong className="text-foreground">{email}</strong>. Please check your inbox and verify your account.
            </p>
            <p>
              After confirming your email, you&apos;ll be asked to set up your security questions before accessing the app.
            </p>
          </CardContent>
          <CardFooter>
            <Button render={<Link href="/login" />} variant="outline" className="auth-btn-motion w-full">
              {t("login")}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div key={shakeKey} className={shakeKey > 0 ? "auth-shake" : "auth-motion-card"}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">{t("signup")}</CardTitle>
          <CardDescription>
            Create your account to start generating lesson plans
          </CardDescription>
        </CardHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-6 px-6 pb-2">
          {[1, 2].map((s) => (
            <div key={s} className="flex flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  step >= s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground ring-1 ring-border"
                }`}
              >
                {s}
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {s === 1 ? t("accountDetails") : t("securityQuestions")}
              </span>
            </div>
          ))}
        </div>

        {error && (
          <div className="px-6">
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          </div>
        )}

        {step === 1 && (
          <form
            onSubmit={handleStep1}
            className={stepLeaving ? "auth-step-leave" : "auth-step-enter"}
          >
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">{t("fullName")}</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Juan Dela Cruz"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  required
                  className="auth-input"
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
                  autoComplete="email"
                  required
                  className="auth-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("password")}</Label>
                <PasswordInput
                  id="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="auth-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
                <PasswordInput
                  id="confirmPassword"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="auth-input"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="auth-btn-motion w-full">
                {t("continue")}
              </Button>
              <p className="text-sm text-muted-foreground">
                {t("alreadyHaveAccount")}{" "}
                <Link href="/login" className="text-primary underline">
                  {t("login")}
                </Link>
              </p>
            </CardFooter>
          </form>
        )}

        {step === 2 && (
          <form
            onSubmit={handleSignup}
            className={stepLeaving ? "auth-step-leave" : "auth-step-enter"}
          >
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose at least {MIN_SECURITY_QUESTIONS} questions you can remember. You&apos;ll need
                them to reset your password without email.
              </p>
              <SecurityQuestionsField value={securityRows} onChange={setSecurityRows} />
            </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="button"
              variant="outline"
              className="auth-btn-motion w-full"
              onClick={() => advanceStep(1)}
              disabled={loading}
            >
              {t("back")}
            </Button>
            <Button type="submit" className="auth-btn-motion w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader size="sm" />
                  {t("loading")}
                </span>
              ) : (
                t("signup")
              )}
            </Button>
          </CardFooter>
        </form>
      )}
      </Card>
    </div>
  );
}