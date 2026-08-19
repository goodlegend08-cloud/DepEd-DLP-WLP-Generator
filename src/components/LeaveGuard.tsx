"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

interface LeaveGuardProps {
  /** When true, attempts to leave the current view are intercepted. */
  enabled: boolean;
  /** Increment this counter to request a guarded programmatic exit (e.g. "Back to Form"). */
  exitSignal?: number;
  /** Called when the user confirms a programmatic exit. */
  onConfirmExit?: () => void;
}

export function LeaveGuard({ enabled, exitSignal = 0, onConfirmExit }: LeaveGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const [pending, setPending] = useState<{ type: "link" | "pop" | "custom"; href?: string } | null>(null);
  const pendingRef = useRef(pending);
  const onConfirmExitRef = useRef(onConfirmExit);
  const prevSignal = useRef(exitSignal);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    onConfirmExitRef.current = onConfirmExit;
  }, [onConfirmExit]);

  // Block refresh/close (native browser dialog — the only way to catch real unloads).
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      // Older Safari needs a truthy return value to show the confirm.
      return "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [enabled]);

  // Intercept in-app <a> navigations (navbar, logo, dropdown links).
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: MouseEvent) => {
      if (pendingRef.current) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const el = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!el) return;
      if (el.hasAttribute("download")) return; // programmatic file download anchors
      const href = el.getAttribute("href") || "";
      if (
        !href ||
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("#") ||
        href.startsWith("javascript:") ||
        href.startsWith("blob:") ||
        href.startsWith("data:")
      ) {
        return;
      }
      if (el.target === "_blank") return;
      if (href === pathname) return;
      e.preventDefault();
      e.stopPropagation();
      setPending({ type: "link", href });
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [enabled, pathname]);

  // Intercept browser back/forward. Restore the current URL so the route does
  // not change under the modal; on confirm, router.back() performs the real one.
  useEffect(() => {
    if (!enabled) return;
    const handler = () => {
      if (pendingRef.current) return;
      window.history.pushState(null, "", window.location.href);
      setPending({ type: "pop" });
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [enabled]);

  // Programmatic guarded exit requested by the parent (e.g. "Back to Form").
  useEffect(() => {
    if (!enabled) return;
    if (exitSignal > prevSignal.current) {
      prevSignal.current = exitSignal;
      setPending({ type: "custom" });
    }
  }, [enabled, exitSignal]);

  const confirmLeave = () => {
    const p = pendingRef.current;
    setPending(null);
    if (!p) return;
    if (p.type === "link" && p.href) {
      router.push(p.href);
    } else if (p.type === "pop") {
      router.back();
    } else if (p.type === "custom") {
      onConfirmExitRef.current?.();
    }
  };

  return pending ? (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-2xl">
        <p className="font-semibold">{t("leaveConfirmTitle")}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t("leaveConfirmMessage")}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setPending(null)}>
            {t("stay")}
          </Button>
          <Button variant="destructive" onClick={confirmLeave}>
            {t("leave")}
          </Button>
        </div>
      </div>
    </div>
  ) : null;
}