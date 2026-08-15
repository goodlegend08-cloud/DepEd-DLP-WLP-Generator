"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  SecurityQuestionsField,
  type SecurityQuestionRow,
} from "@/components/security/SecurityQuestionsField";
import { MIN_SECURITY_QUESTIONS } from "@/lib/security-questions";
import { ShieldCheck, Lock } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export default function AccountPage() {
  return (
    <Suspense>
      <AccountForm />
    </Suspense>
  );
}

function AccountForm() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [password, setPassword] = useState("");
  const [reauthenticated, setReauthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [currentQuestions, setCurrentQuestions] = useState<string[]>([]);
  const [rows, setRows] = useState<SecurityQuestionRow[]>([
    { question: "", answer: "" },
    { question: "", answer: "" },
  ]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!cancelled) setUser(user);
    };
    getUser();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const handleReauthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      const res = await fetch("/api/security/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAuthError(json.error || "Incorrect password");
        setAuthLoading(false);
        return;
      }

      // Load current questions after re-authentication.
      const qRes = await fetch("/api/security/questions");
      const qJson = await qRes.json();
      if (qRes.ok && Array.isArray(qJson.questions)) {
        setCurrentQuestions(qJson.questions);
        setRows(qJson.questions.map((q: string) => ({ question: q, answer: "" })));
      }

      setReauthenticated(true);
    } catch {
      setAuthError("Something went wrong. Please try again.");
    }
    setAuthLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaved(false);

    const answered = rows.filter((r) => r.question && r.answer.trim());
    if (answered.length < MIN_SECURITY_QUESTIONS) {
      setSaveError(`Please select and answer at least ${MIN_SECURITY_QUESTIONS} security questions.`);
      return;
    }

    setSaveLoading(true);
    try {
      const res = await fetch("/api/security/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: password,
          questions: answered.map(({ question, answer }) => ({ question, answer })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSaveError(json.error || "Failed to save security questions.");
        setSaveLoading(false);
        return;
      }
      setCurrentQuestions(answered.map((r) => r.question));
      setRows(answered.map((r) => ({ question: r.question, answer: "" })));
      setSaved(true);
    } catch {
      setSaveError("Something went wrong. Please try again.");
    }
    setSaveLoading(false);
  };

  if (!user) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Loading...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground">{user.email}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Security Questions
          </CardTitle>
          <CardDescription>
            {reauthenticated
              ? "Your security questions are shown below. Re-enter answers to update them."
              : "Re-authenticate with your current password to view or update your security questions."}
          </CardDescription>
        </CardHeader>

        {!reauthenticated ? (
          <form onSubmit={handleReauthenticate}>
            <CardContent className="space-y-4">
              {authError && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {authError}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <PasswordInput
                  id="currentPassword"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={authLoading}>
                {authLoading ? "Verifying..." : "Verify password"}
              </Button>
            </CardFooter>
          </form>
        ) : (
          <form onSubmit={handleSave}>
            <CardContent className="space-y-4">
              {saveError && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {saveError}
                </div>
              )}
              {saved && (
                <div className="rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-600">
                  Security questions updated successfully.
                </div>
              )}
              {currentQuestions.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Current questions: {currentQuestions.join(" • ")}
                </p>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="h-4 w-4" />
                Your answers are hashed and can&apos;t be read back. Re-enter them to change your setup.
              </div>
              <SecurityQuestionsField value={rows} onChange={setRows} />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={saveLoading}>
                {saveLoading ? "Saving..." : "Save security questions"}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}