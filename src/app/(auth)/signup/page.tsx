"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getSiteUrl } from "@/lib/site-url";
import {
  SecurityQuestionsField,
  type SecurityQuestionRow,
} from "@/components/security/SecurityQuestionsField";
import { MIN_SECURITY_QUESTIONS } from "@/lib/security-questions";

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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

  // Validate Step 1 (account details) then advance to Step 2.
  const handleStep1 = (e: React.FormEvent) => {
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

    setStep(2);
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
      <div className="auth-card">
        <span className="auth-singup">{t("signup")}</span>
        <div className="auth-field-group">
          <p className="auth-msg" style={{ color: "#000" }}>
            Check your email
          </p>
          <p className="auth-msg" style={{ color: "#000", textTransform: "none", textAlign: "center" }}>
            We sent a confirmation link to <strong>{email}</strong>. Please check your inbox and verify your account.
          </p>
          <p className="auth-msg" style={{ color: "#000", textTransform: "none", textAlign: "center" }}>
            After confirming your email, you&apos;ll be asked to set up your security questions before accessing the app.
          </p>
          <Link href="/login" className="auth-link">
            {t("login")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`auth-card ${step === 2 ? "auth-card--wide" : ""}`}>
      <span className="auth-singup">{t("signup")}</span>

      <div className="auth-row" style={{ marginTop: 0 }}>
        <div className="flex items-center gap-2">
          {[1, 2].map((s) => (
            <div key={s} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  step >= s
                    ? "bg-black text-white"
                    : "bg-white text-black ring-1 ring-black/30"
                }`}
              >
                {s}
              </div>
              <span className="text-[10px] uppercase tracking-wider text-black/70">
                {s === 1 ? t("accountDetails") : t("securityQuestions")}
              </span>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="auth-msg">{error}</p>}

      {step === 1 && (
        <form className="auth-field-group" onSubmit={handleStep1}>
          <div className="auth-inputBox">
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
            <span>{t("fullName")}</span>
          </div>
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
          <div className="auth-inputBox">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <span>{t("password")}</span>
            <button
              type="button"
              className="auth-eye"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <div className="auth-inputBox1">
            <input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
            <span>{t("confirmPassword")}</span>
            <button
              type="button"
              className="auth-eye"
              onClick={() => setShowConfirm((prev) => !prev)}
              aria-label={showConfirm ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <button type="submit" className="auth-enter" style={{ marginBottom: 0 }}>
            {t("continue")}
          </button>
          <p className="auth-msg" style={{ color: "#000", textTransform: "none" }}>
            {t("alreadyHaveAccount")}{" "}
            <Link href="/login" className="auth-link">
              {t("login")}
            </Link>
          </p>
        </form>
      )}

      {step === 2 && (
        <form className="auth-field-group" onSubmit={handleSignup}>
          <div className="w-full px-4">
            <p className="auth-msg" style={{ color: "#000", textTransform: "none", marginBottom: "12px" }}>
              Choose at least {MIN_SECURITY_QUESTIONS} questions you can remember. You&apos;ll need
              them to reset your password without email.
            </p>
            <SecurityQuestionsField value={securityRows} onChange={setSecurityRows} />
          </div>
          <div className="flex w-full items-center justify-center gap-3 px-4">
            <button
              type="button"
              className="auth-enter"
              style={{ marginBottom: 0 }}
              onClick={() => setStep(1)}
              disabled={loading}
            >
              {t("back")}
            </button>
            <button type="submit" className="auth-enter" style={{ marginBottom: 0 }} disabled={loading}>
              {loading ? t("loading") : t("signup")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}