import type { ReactNode } from "react";
import { APP_VERSION } from "@/lib/version";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 font-sans">
      <div className="relative w-full max-w-md">{children}</div>
      <p className="absolute inset-x-0 bottom-4 text-center text-xs text-muted-foreground">
        {APP_VERSION}
      </p>
    </div>
  );
}