"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
      <div className="auth-card">
        <span className="auth-singup">{t("forgotPassword")}</span>

        <form className="auth-field-group" onSubmit={handleVerify}>
          {error && <p className="auth-msg">{error}</p>}
          {questions.map((q, index) => {
            const question = toQuestionString(q);
            return (
              <div key={`${index}-${question}`} className="auth-inputBox1">
                <input
                  id={`answer-${index}`}
                  type="text"
                  autoComplete="off"
                  required
                  value={answers[question] ?? ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [question]: e.target.value }))}
                />
                <span>{question}</span>
              </div>
            );
          })}
          <button type="submit" className="auth-enter" style={{ marginBottom: 0 }} disabled={loading}>
            {loading ? t("loading") : t("verifyAnswers")}
          </button>
        </form>

        <div className="auth-row">
          <button
            type="button"
            onClick={() => {
              setQuestions([]);
              setAnswers({});
              setError(null);
            }}
            className="auth-link"
          >
            Back
          </button>
          <span className="text-xs text-black/70">
            {t("rememberPassword")}{" "}
            <Link href="/login" className="auth-link">
              {t("login")}
            </Link>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <span className="auth-singup">{t("forgotPassword")}</span>

      {error && <p className="auth-msg">{error}</p>}

      <form className="auth-field-group" onSubmit={handleLookup}>
        <div className="auth-inputBox1">
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
        <p className="auth-msg" style={{ color: "#000", textTransform: "none", textAlign: "center", maxWidth: "220px" }}>
          Enter your email. We&apos;ll show your security questions so you can reset your password
          without a reset email.
        </p>
        <button type="submit" className="auth-enter" style={{ marginBottom: 0 }} disabled={loading}>
          {loading ? t("loading") : t("continue")}
        </button>
      </form>

      <div className="auth-row">
        <span className="text-xs text-black/70">
          {t("rememberPassword")}{" "}
          <Link href="/login" className="auth-link">
            {t("login")}
          </Link>
        </span>
      </div>
    </div>
  );
}