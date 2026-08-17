import type { ReactNode } from "react";
import { APP_VERSION } from "@/lib/version";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center px-3 py-6 font-sans sm:px-6">
      <div className="relative w-full max-w-[400px]">{children}</div>
      <p className="absolute inset-x-0 bottom-4 text-center text-xs text-slate-400">
        {APP_VERSION}
      </p>
    </div>
  );
}