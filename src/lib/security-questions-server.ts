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

/**
 * Short-lived password-reset token issued after security answers are verified.
 *
 * The token is an HMAC-signed payload `email::expiresAt` that proves the
 * bearer passed the security-question gate and allows the password reset form
 * to call the reset API without re-verifying answers.
 */
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes

function resetTokenSecret(): string {
  return getSecret();
}

export function createPasswordResetToken(email: string): {
  token: string;
  expiresAt: number;
} {
  const secret = resetTokenSecret();
  const expiresAt = Date.now() + RESET_TOKEN_TTL_MS;
  const payload = `${email.toLowerCase()}::${expiresAt}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return { token: `${payload}::${signature}`, expiresAt };
}

/**
 * Verifies a reset token's signature and expiry. Returns the email embedded
 * in the token, or null if the token is invalid or expired.
 */
export function verifyPasswordResetToken(token: string): string | null {
  const secret = resetTokenSecret();
  const parts = token.split("::");
  if (parts.length !== 3) return null;

  const [email, expiresAtRaw, signature] = parts;
  const payload = `${email}::${expiresAtRaw}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const actual = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (actual.length !== expectedBuffer.length || !timingSafeEqual(actual, expectedBuffer)) {
    return null;
  }

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;

  return email;
}