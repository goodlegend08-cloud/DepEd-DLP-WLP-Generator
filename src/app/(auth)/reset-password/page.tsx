"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Loader } from "@/components/Loader";

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
      <div className="auth-card">
        <span className="auth-singup">{t("resetPassword")}</span>
        <div className="auth-field-group">
          <p className="auth-msg" style={{ color: "#000", textTransform: "none", textAlign: "center" }}>
            This reset link is invalid or has expired. Please request a new one.
          </p>
          <Link href="/forgot-password" className="auth-enter" style={{ textAlign: "center", textDecoration: "none", marginBottom: 0 }}>
            {t("continue")}
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="auth-card">
        <span className="auth-singup">{t("passwordReset")}</span>
        <div className="auth-field-group">
          <p className="auth-msg" style={{ color: "#000", textTransform: "none", textAlign: "center" }}>
            {t("passwordResetSuccess")}
          </p>
          <button type="button" className="auth-enter" style={{ marginBottom: 0 }} onClick={() => router.push("/login")}>
            {t("login")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <span className="auth-singup">{t("resetPassword")}</span>

      {error && <p className="auth-msg">{error}</p>}

      <form className="auth-field-group" onSubmit={handleResetPassword}>
        <div className="auth-inputBox">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <span>{t("newPassword")}</span>
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
        <button type="submit" className="auth-enter" style={{ marginBottom: 0 }} disabled={loading}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader size="sm" />
              {t("loading")}
            </span>
          ) : (
            t("resetPassword")
          )}
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