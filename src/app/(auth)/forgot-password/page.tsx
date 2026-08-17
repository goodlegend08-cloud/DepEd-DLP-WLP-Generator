"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

function toQuestionString(q: unknown): string {
  if (typeof q === "string") return q;
  if (q && typeof q === "object") {
    const o = q as Record<string, unknown>;
    const value = o.question ?? o.question_text ?? o.prompt;
    if (typeof value === "string") return value;
  }
  return "";
}

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useI18n();

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
      const questionStrings = (json.questions as unknown[])
        .map((q: unknown) => toQuestionString(q))
        .filter((q: string) => q.length > 0);
      if (questionStrings.length === 0) {
        setError("No security questions found for this email. Please check the email you entered.");
        setLoading(false);
        return;
      }
      setQuestions(questionStrings);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const providedAnswers = questions.map((q) => ({ question: q, answer: answers[q] ?? "" }));
    if (providedAnswers.some((a) => !a.answer.trim())) {
      setError("Please answer every security question.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/security/forgot/verify-answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, answers: providedAnswers }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Unable to verify security answers. Please try again.");
        setLoading(false);
        return;
      }
      // Answers verified: proceed to the password reset step with the short-lived token.
      router.push(`/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(json.token)}`);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  if (questions.length > 0) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {t("forgotPassword")}
          </CardTitle>
          <CardDescription>
            Answer your security questions to verify your identity.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleVerify}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {questions.map((q, index) => {
              const question = toQuestionString(q);
              return (
                <div key={`${index}-${question}`} className="space-y-2">
                  <Label htmlFor={`answer-${index}`}>{question}</Label>
                  <Input
                    id={`answer-${index}`}
                    type="text"
                    autoComplete="off"
                    placeholder="Your answer"
                    value={answers[question] ?? ""}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [question]: e.target.value }))}
                    required
                  />
                </div>
              );
            })}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("loading") : t("verifyAnswers")}
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
            {loading ? t("loading") : t("continue")}
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