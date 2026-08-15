export const MIN_SECURITY_QUESTIONS = 2;

export const SECURITY_QUESTIONS = [
  "What is your mother's maiden name?",
  "What is the name of your first pet?",
  "What city were you born in?",
  "What was the name of your elementary school?",
  "What is your father's middle name?",
  "What was the name of your childhood best friend?",
  "What is your favorite teacher's last name?",
  "What is the name of the street you grew up on?",
  "What was the model of your first car?",
  "What is your favorite book?",
] as const;

export type SecurityQuestion = (typeof SECURITY_QUESTIONS)[number];

export interface SecurityQuestionInput {
  question: string;
  answer: string;
}

/**
 * Normalizes a security answer: trims surrounding whitespace, collapses
 * internal whitespace, and lowercases. Applied before hashing so answers are
 * matched case-insensitively regardless of spacing.
 */
export function normalizeAnswer(answer: string): string {
  return answer.trim().replace(/\s+/g, " ").toLowerCase();
}

export function isValidSecurityQuestion(question: string): boolean {
  return (SECURITY_QUESTIONS as readonly string[]).includes(question);
}