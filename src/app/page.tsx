"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AuthErrorRedirect } from "@/components/AuthErrorRedirect";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { BookOpen, FileText, Zap, Shield } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const { t, language, setLanguage } = useI18n();
  const supabase = createClient();

  // If the user is already logged in, send them straight to the dashboard.
  useEffect(() => {
    let cancelled = false;
    const checkSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (user) {
        router.replace("/dashboard");
        router.refresh();
      }
    };
    checkSession();
    return () => {
      cancelled = true;
    };
  }, [supabase, router]);

  return (
    <div className="flex min-h-screen flex-col">
      <AuthErrorRedirect />
      <header className="container mx-auto flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2 font-bold text-lg">
          <BookOpen className="h-6 w-6" />
          <span>DepEd Auto-DLP/DLL</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLanguage(language === "en" ? "fil" : "en")}
          >
            {language === "en" ? "FIL" : "EN"}
          </Button>
          <Link href="/login">
            <Button variant="ghost" size="sm">{t("login")}</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">{t("signup")}</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            {t("heroTitle")}
          </h1>
          <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("heroSubtitle")}
          </p>
          <p className="mt-2 text-lg text-muted-foreground">
            {t("heroTagline")}
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="text-base px-8">
                {t("getStarted")}
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="text-base px-8">
                {t("loginExisting")}
              </Button>
            </Link>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <Zap className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t("feature1Title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("feature1Desc")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <FileText className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t("feature2Title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("feature2Desc")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Shield className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t("feature3Title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("feature3Desc")}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          {t("landingFooter")}
        </div>
      </footer>
    </div>
  );
}