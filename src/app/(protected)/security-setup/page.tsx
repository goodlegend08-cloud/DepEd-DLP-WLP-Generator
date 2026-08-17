"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader } from "@/components/Loader";
import {
  SecurityQuestionsField,
  type SecurityQuestionRow,
} from "@/components/security/SecurityQuestionsField";
import { MIN_SECURITY_QUESTIONS } from "@/lib/security-questions";

export default function SecuritySetupPage() {
  return (
    <Suspense>
      <SecuritySetupForm />
    </Suspense>
  );
}

function SecuritySetupForm() {
  const [rows, setRows] = useState<SecurityQuestionRow[]>([
    { question: "", answer: "" },
    { question: "", answer: "" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  // If the user already has questions (e.g. session restored from an earlier
  // tab), the middleware redirects them to /dashboard. This check is a
  // client-side safety net for that case.
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const res = await fetch("/api/security/questions");
      if (res.ok) {
        const json = await res.json();
        if (!cancelled && Array.isArray(json.questions) && json.questions.length > 0) {
          router.replace("/dashboard");
          return;
        }
      }
      if (!cancelled) setChecking(false);
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const answered = rows.filter((r) => r.question && r.answer.trim());
    if (answered.length < MIN_SECURITY_QUESTIONS) {
      setError(`Please select and answer at least ${MIN_SECURITY_QUESTIONS} security questions.`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/security/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: answered.map(({ question, answer }) => ({ question, answer })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to save security questions. Please try again.");
        setLoading(false);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">
          Set up security questions
        </CardTitle>
        <CardDescription>
          Before you can use the app, choose at least {MIN_SECURITY_QUESTIONS} security questions
          and answers. You&apos;ll use them to reset your password if you ever forget it.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSave}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label>Security Questions</Label>
            <SecurityQuestionsField value={rows} onChange={setRows} />
          </div>
        </CardContent>
        <CardContent>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Save security questions"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}