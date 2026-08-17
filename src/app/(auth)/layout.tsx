import type { ReactNode } from "react";
import { APP_VERSION } from "@/lib/version";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-4 text-xs text-muted-foreground">{APP_VERSION}</p>
    </div>
  );
}
