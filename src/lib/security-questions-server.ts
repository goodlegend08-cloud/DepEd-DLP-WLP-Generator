import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeAnswer } from "@/lib/security-questions";

/**
 * Server-only helpers for hashing and verifying security answers.
 *
 * Answers are hashed with HMAC-SHA256 using a per-deployment secret
 * (SECURITY_QUESTION_SECRET) plus a per-user salt. Because the secret never
 * reaches the browser, answers can't be re-derived from the stored hashes.
 * Normalization (lowercase/trim) happens before hashing.
 */

function getSecret(): string {
  const secret = process.env.SECURITY_QUESTION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SECURITY_QUESTION_SECRET must be set to at least 16 characters");
  }
  return secret;
}

export function hashAnswer(userId: string, question: string, answer: string): string {
  const secret = getSecret();
  return createHmac("sha256", secret)
    .update(`${userId}::${question.toLowerCase()}::${normalizeAnswer(answer)}`)
    .digest("hex");
}

export function verifyAnswer(
  userId: string,
  question: string,
  answer: string,
  expectedHash: string
): boolean {
  const secret = getSecret();
  const actual = createHmac("sha256", secret)
    .update(`${userId}::${question.toLowerCase()}::${normalizeAnswer(answer)}`)
    .digest();
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}