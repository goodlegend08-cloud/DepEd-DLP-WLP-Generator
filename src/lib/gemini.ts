import OpenAI from "openai";

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY!,
  baseURL: "https://api.groq.com/openai/v1",
});

const MODEL_NAME = "llama-3.3-70b-versatile";

// Rate limiting: max 3 requests per minute per user
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 60_000;
const requestTimestamps = new Map<string, number[]>();

function checkRateLimit(userId: string): void {
  const now = Date.now();
  const timestamps = (requestTimestamps.get(userId) ?? []).filter(
    (t) => now - t < RATE_WINDOW_MS
  );

  if (timestamps.length >= RATE_LIMIT) {
    const oldest = timestamps[0];
    const waitMs = RATE_WINDOW_MS - (now - oldest);
    throw new Error(
      `Rate limit exceeded. Try again in ${Math.ceil(waitMs / 1000)}s.`
    );
  }

  timestamps.push(now);
  requestTimestamps.set(userId, timestamps);
}

// Periodically clean up stale entries (every 5 min)
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of requestTimestamps) {
    const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
    if (recent.length === 0) {
      requestTimestamps.delete(key);
    } else {
      requestTimestamps.set(key, recent);
    }
  }
}, 300_000);

export async function generateLessonPlan(
  systemPrompt: string,
  userPrompt: string,
  userId?: string
): Promise<string> {
  if (userId) {
    checkRateLimit(userId);
  }

  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await groq.chat.completions.create({
        model: MODEL_NAME,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 4096,
      });

      return result.choices[0].message.content ?? "";
    } catch (error) {
      lastError = error as Error;
      const isRateLimit =
        lastError.message.includes("429") ||
        lastError.message.includes("rate_limit") ||
        lastError.message.includes("RESOURCE_EXHAUSTED");

      if (isRateLimit && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt + 1) * 5000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new Error("Failed to generate lesson plan after retries");
}
