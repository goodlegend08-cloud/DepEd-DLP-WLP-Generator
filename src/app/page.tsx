import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, FileText, Zap, Shield } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="container mx-auto flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2 font-bold text-lg">
          <BookOpen className="h-6 w-6" />
          <span>DepEd Auto-DLP/DLL</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">Login</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Sign Up</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            DepEd Auto-DLP/DLL Generator
          </h1>
          <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto">
            Awtomatikong Tagalikha ng Daily Lesson Log at Detailed Lesson Plan para sa mga Pilipinong Guro
          </p>
          <p className="mt-2 text-lg text-muted-foreground">
            Free, AI-powered, DepEd-compliant
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="text-base px-8">
                Get Started
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="text-base px-8">
                I already have an account
              </Button>
            </Link>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <Zap className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">AI-Powered Generation</h3>
                <p className="text-sm text-muted-foreground">
                  Generate complete, pedagogically-sound lesson plans in seconds using Google Gemini AI. Aligned with DepEd standards.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <FileText className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">DepEd-Compliant Format</h3>
                <p className="text-sm text-muted-foreground">
                  Output follows official DLL/DLP structure with proper sections, COI/RPMS tags, and standard formatting.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Shield className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">Free & Private</h3>
                <p className="text-sm text-muted-foreground">
                  Zero cost. Your data stays private with secure authentication and row-level security. No student PII stored.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          DepEd Auto-DLP/DLL Generator v1.0 — Built for Filipino Educators
        </div>
      </footer>
    </div>
  );
}
