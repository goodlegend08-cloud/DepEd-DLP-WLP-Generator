import type { ReactNode } from "react";
import { APP_VERSION } from "@/lib/version";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-muted/30 px-4">
      {/* Ambient background orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -left-20 h-96 w-96 rounded-full bg-slate-300/30 blur-3xl dark:bg-slate-700/20 auth-orb"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -bottom-20 h-96 w-96 rounded-full bg-neutral-200/40 blur-3xl dark:bg-neutral-800/30 auth-orb auth-orb--alt"
      />

      {/* Subtle dot matrix pattern overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.04] auth-dot-matrix"
      />

      <div className="relative w-full max-w-md">{children}</div>
      <p className="relative mt-4 text-xs text-muted-foreground">{APP_VERSION}</p>
    </div>
  );
}