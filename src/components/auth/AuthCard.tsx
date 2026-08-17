"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
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
import { BookOpen, Mail, Lock, User } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  auth_callback_error:
    "Email confirmation failed. The link may have expired or already been used. Please try signing up again.",
  email_not_confirmed:
    "Please confirm your email before logging in. Check your inbox (and spam folder) for the confirmation link.",
};

const AUTH_INPUT_CLASS =
  "rounded-xl border-slate-200 shadow-sm transition-all focus-visible:border-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900/10 dark:border-slate-800 dark:focus-visible:border-slate-100";

const ACTION_BUTTON_CLASS =
  "bg-slate-900 text-white font-medium py-2.5 rounded-xl shadow-md hover:bg-slate-800 hover:shadow-lg transition-all";

type AuthMode = "login" | "signup";

const MODE_VARIANTS = {
  initial: (mode: AuthMode) => ({ opacity: 0, x: mode === "signup" ? 30 : -30, rotateY: 10 }),
  animate: { opacity: 1, x: 0, rotateY: 0 },
  exit: (mode: AuthMode) => ({ opacity: 0, x: mode === "signup" ? -30 : 30, rotateY: -10 }),
};

export default function AuthCard({ initialMode = "login" }: { initialMode?: AuthMode }) {
  return (
    <Suspense>
      <AuthCardInner initialMode={initialMode} />
    </Suspense>
  );
}

function AuthCardInner({ initialMode = "login" }: { initialMode?: AuthMode }) {
  const [isSignUp, setIsSignUp] = useState(initialMode === "signup");
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
  const [isHydrating, setIsHydrating] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { t } = useI18n();

  useEffect(() => {
    let cancelled = false;
    const checkSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;

      if (user) {
        // Middleware normally blocks logged-in users from auth routes, but if a
        // session becomes active after mount (e.g. callback navigation), bounce
        // them to the dashboard instead of showing the auth forms.
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      setIsHydrating(false);
    };
    checkSession();
    return () => {
      cancelled = true;
    };
  }, [supabase, router]);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      queueMicrotask(() => {
        setError(ERROR_MESSAGES[errorParam] || "An error occurred. Please try again.");
        setShakeKey((k) => k + 1);
      });
    }
  }, [searchParams]);

  const handleToggle = () => {
    setIsSignUp((prev) => !prev);
    setError(null);
    setSuccess(false);
    setStep(1);
    setStepLeaving(false);
    setPassword("");
    setConfirmPassword("");
  };

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
      setShakeKey((k) => k + 1);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

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

  return (
    <motion.div layout className="w-full" transition={{ duration: 0.35, ease: "easeInOut" }}>
      <AnimatePresence mode="wait" initial={false}>
        {isHydrating ? (
          <motion.div
            key="auth-skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md p-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-xl animate-pulse space-y-6"
          >
            <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/3 mx-auto" />
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3 mx-auto" />
            <div className="space-y-4 pt-4">
              <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-lg w-full" />
              <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-lg w-full" />
              <div className="h-11 bg-slate-300 dark:bg-slate-700 rounded-lg w-full mt-6" />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="auth-card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
          >
            <div key={shakeKey} className={shakeKey > 0 ? "auth-shake" : "auth-motion-card"}>
              <Card className="bg-white/80 shadow-xl backdrop-blur-md border border-slate-200/60 dark:bg-slate-900/80 dark:border-slate-800/60">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={isSignUp ? "signup" : "login"}
              custom={isSignUp ? "signup" : "login"}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={MODE_VARIANTS}
              transition={{ duration: 0.35, ease: "easeInOut" }}
            >
              {isSignUp ? (
                success ? (
                  <div>
                    <CardHeader className="text-center">
                      <div className="mb-3 flex justify-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md">
                          <BookOpen className="h-5 w-5" />
                        </div>
                      </div>
                      <CardTitle className="text-2xl font-bold font-sans">{t("signup")}</CardTitle>
                      <CardDescription className="text-sm font-normal leading-tight text-slate-500 dark:text-slate-400">
                        Check your email
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-center text-sm text-muted-foreground">
                      <p>
                        We sent a confirmation link to{" "}
                        <strong className="text-foreground">{email}</strong>. Please check your
                        inbox and verify your account.
                      </p>
                      <p>
                        After confirming your email, you&apos;ll be asked to set up your security
                        questions before accessing the app.
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button
                        type="button"
                        variant="outline"
                        className={`auth-btn-motion w-full ${ACTION_BUTTON_CLASS}`}
                        onClick={() => {
                          setIsSignUp(false);
                          setError(null);
                          setSuccess(false);
                        }}
                      >
                        {t("login")}
                      </Button>
                    </CardFooter>
                  </div>
                ) : (
                  <>
                    <CardHeader className="text-center">
                      <div className="mb-3 flex justify-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md">
                          <BookOpen className="h-5 w-5" />
                        </div>
                      </div>
                      <CardTitle className="text-2xl font-bold font-sans">{t("signup")}</CardTitle>
                      <CardDescription className="text-sm font-normal leading-tight text-slate-500 dark:text-slate-400">
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
                        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                          {error}
                        </div>
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
                            <div className="relative">
                              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                              <Input
                                id="fullName"
                                type="text"
                                placeholder="Juan Dela Cruz"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                autoComplete="name"
                                required
                                className={`pl-10 ${AUTH_INPUT_CLASS}`}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email">{t("email")}</Label>
                            <div className="relative">
                              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                              <Input
                                id="email"
                                type="email"
                                placeholder="teacher@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                                required
                                className={`pl-10 ${AUTH_INPUT_CLASS}`}
                              />
                            </div>
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
                              leadingIcon={<Lock className="h-4 w-4" />}
                              className="auth-input"
                              inputClassName={AUTH_INPUT_CLASS}
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
                              leadingIcon={<Lock className="h-4 w-4" />}
                              className="auth-input"
                              inputClassName={AUTH_INPUT_CLASS}
                            />
                          </div>
                        </CardContent>
                        <CardFooter className="flex flex-col space-y-4">
                          <Button
                            type="submit"
                            className={`auth-btn-motion w-full ${ACTION_BUTTON_CLASS}`}
                          >
                            {t("continue")}
                          </Button>
                          <p className="text-xs text-slate-600">
                            {t("alreadyHaveAccount")}{" "}
                            <button
                              type="button"
                              onClick={handleToggle}
                              className="font-medium text-slate-600 underline-offset-4 transition-colors hover:text-slate-900 hover:underline"
                            >
                              {t("login")}
                            </button>
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
                            Choose at least {MIN_SECURITY_QUESTIONS} questions you can remember.
                            You&apos;ll need them to reset your password without email.
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
                          <Button type="submit" className={`auth-btn-motion w-full ${ACTION_BUTTON_CLASS}`} disabled={loading}>
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
                  </>
                )
              ) : (
                <>
                  <CardHeader className="text-center">
                    <div className="mb-3 flex justify-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md">
                        <BookOpen className="h-5 w-5" />
                      </div>
                    </div>
                    <CardTitle className="text-2xl font-bold font-sans">{t("login")}</CardTitle>
                    <CardDescription className="text-sm font-normal leading-tight text-slate-500 dark:text-slate-400">
                      Welcome back to DepEd Auto-DLP/DLL
                    </CardDescription>
                  </CardHeader>
                  <form onSubmit={handleLogin}>
                    <CardContent className="space-y-4">
                      {error && (
                        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                          {error}
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="login-email">{t("email")}</Label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="teacher@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            required
                            className={`pl-10 ${AUTH_INPUT_CLASS}`}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">{t("password")}</Label>
                        <PasswordInput
                          id="login-password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete="current-password"
                          required
                          leadingIcon={<Lock className="h-4 w-4" />}
                          className="auth-input"
                          inputClassName={AUTH_INPUT_CLASS}
                        />
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4">
                      <Button
                        type="submit"
                        className={`auth-btn-motion w-full ${ACTION_BUTTON_CLASS}`}
                        disabled={loading}
                      >
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
                        <a
                          href="/forgot-password"
                          className="text-xs font-medium text-slate-600 underline-offset-4 transition-colors hover:text-slate-900 hover:underline"
                        >
                          {t("forgotPassword")}
                        </a>
                        <span className="text-xs text-slate-600">
                          {t("noAccount")}{" "}
                          <button
                            type="button"
                            onClick={handleToggle}
                            className="font-medium text-slate-600 underline-offset-4 transition-colors hover:text-slate-900 hover:underline"
                          >
                            {t("signup")}
                          </button>
                        </span>
                      </div>
                    </CardFooter>
                  </form>
                </>
              )}
            </motion.div>
            </AnimatePresence>
          </Card>
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
