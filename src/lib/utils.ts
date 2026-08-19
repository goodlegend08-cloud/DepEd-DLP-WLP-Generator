import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Strips a legacy "Item N (Label): " or "Answer Key — Item N" prefix that older
 * generated exit-ticket values may carry (the app renders these labels itself).
 */
export function stripTicketLabel(value: string, kind: "item" | "answer"): string {
  let s = value.trim();
  if (kind === "item") {
    s = s.replace(/^Item\s+\d+\s*\([^)]*\)\s*:\s*/i, "");
  } else {
    s = s.replace(/^Answer\s+Key\s*[-—–]\s*Item\s+\d+\s*[:.\s]*/i, "");
  }
  return s.trim();
}
