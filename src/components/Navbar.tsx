"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Settings } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { APP_VERSION } from "@/lib/version";

export function Navbar() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const { t, language, setLanguage } = useI18n();

  useEffect(() => {
    let cancelled = false;
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!cancelled) {
        setUser(user);
        setLoading(false);
      }
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!cancelled) {
          setUser(session?.user ?? null);
        }
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  // Hide navbar on auth pages
  if (pathname === "/login" || pathname === "/signup" || pathname === "/") {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 font-bold">
          <Image
            src="/deped-logo.jpg"
            alt="DepEd Auto-DLP/DLL logo"
            width={512}
            height={512}
            priority
            className="h-7 w-7 rounded-lg"
          />
          <span className="hidden sm:inline">DepEd Auto-DLP/DLL</span>
          <span className="sm:hidden">DLP</span>
          <span className="hidden rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
            {APP_VERSION}
          </span>
        </Link>

        {user && (
          <nav className="flex items-center gap-1">
            <Link href="/dashboard">
              <Button variant={pathname === "/dashboard" ? "secondary" : "ghost"} size="sm">
                {t("dashboard")}
              </Button>
            </Link>
            <Link href="/generate">
              <Button variant={pathname === "/generate" ? "secondary" : "ghost"} size="sm">
                {t("generate")}
              </Button>
            </Link>
            <Link href="/scheduler">
              <Button variant={pathname === "/scheduler" ? "secondary" : "ghost"} size="sm">
                DBOW Dates
              </Button>
            </Link>
          </nav>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLanguage(language === "en" ? "fil" : "en")}
          >
            {language === "en" ? "FIL" : "EN"}
          </Button>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" className="rounded-full" />
                }
              >
                <User className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <Link href="/account">
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Account
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
