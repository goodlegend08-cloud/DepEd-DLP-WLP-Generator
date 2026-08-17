"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
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
import { BookOpen, LogOut, Menu, User, Settings, LayoutDashboard, Wand2, CalendarDays } from "lucide-react";
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

  const navLinks = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/generate", label: t("generate"), icon: Wand2 },
    { href: "/scheduler", label: "DBOW Dates", icon: CalendarDays },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-white/80 backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-900/80">
      <div className="mx-auto flex h-14 w-full max-w-full items-center justify-between gap-2 px-3 sm:px-6">
        <Link href={user ? "/dashboard" : "/"} className="flex min-w-0 items-center gap-2 font-bold">
          <BookOpen className="h-5 w-5 shrink-0" />
          <span className="truncate text-sm font-bold max-w-[140px] sm:text-base sm:max-w-[260px]">
            DepEd Auto-DLP/DLL
          </span>
          <span className="hidden rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
            {APP_VERSION}
          </span>
        </Link>

        {user && (
          <>
            {/* Desktop nav */}
            <nav className="hidden items-center gap-1 sm:flex">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <Button
                    variant={pathname === link.href ? "secondary" : "ghost"}
                    size="sm"
                    className="whitespace-nowrap"
                  >
                    {link.label}
                  </Button>
                </Link>
              ))}
            </nav>

            {/* Mobile nav drawer */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="sm" className="sm:hidden" />}
              >
                <Menu className="h-4 w-4" />
                <span className="ml-1 hidden">Menu</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px] sm:hidden">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const active = pathname === link.href;
                  return (
                    <Link key={link.href} href={link.href}>
                      <DropdownMenuItem className={active ? "bg-muted" : undefined}>
                        <Icon className="mr-2 h-4 w-4" />
                        {link.label}
                      </DropdownMenuItem>
                    </Link>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
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
                <div className="max-w-[240px] truncate px-2 py-1.5">
                  <p className="truncate text-sm font-medium">{user.email}</p>
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
