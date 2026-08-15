"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const { t } = useI18n();

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "recovery_link_expired") {
      queueMicrotask(() => {
        setError("This reset link is invalid or has expired. Please request a new one.");
      });
    }
  }, [searchParams]);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/security/forgot/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      if (!json.questions || json.questions.length === 0) {
        setError("No security questions found for this email. Please check the email you entered.");
        setLoading(false);
        return;
      }
      setQuestions(json.questions);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const providedAnswers = questions.map((q) => ({ question: q, answer: answers[q] ?? "" }));
    if (providedAnswers.some((a) => !a.answer.trim())) {
      setError("Please answer every security question.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/security/forgot/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, answers: providedAnswers, newPassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Unable to verify security answers. Please try again.");
        setLoading(false);
        return;
      }
      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

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
          <Link href="/login" className="w-full">
            <Button className="w-full">{t("login")}</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  if (questions.length > 0) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {t("forgotPassword")}
          </CardTitle>
          <CardDescription>
            Answer your security questions to reset your password.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleReset}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {questions.map((q, index) => (
              <div key={q} className="space-y-2">
                <Label htmlFor={`answer-${index}`}>{q}</Label>
                <Input
                  id={`answer-${index}`}
                  type="text"
                  autoComplete="off"
                  placeholder="Your answer"
                  value={answers[q] ?? ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q]: e.target.value }))}
                  required
                />
              </div>
            ))}
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t("newPassword")}</Label>
              <PasswordInput
                id="newPassword"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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
            <button
              type="button"
              onClick={() => {
                setQuestions([]);
                setAnswers({});
                setError(null);
              }}
              className="text-sm text-muted-foreground underline"
            >
              Back
            </button>
          </CardFooter>
        </form>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">
          {t("forgotPassword")}
        </CardTitle>
        <CardDescription>
          {t("forgotPasswordDesc")}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleLookup}>
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
              required
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Enter your email. We&apos;ll show your security questions so you can reset your password
            without a reset email.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("loading") : t("sendResetLink")}
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