import OpenAI from "openai";

function makeClient(apiKey: string | undefined, baseURL: string): OpenAI {
  return new OpenAI({ apiKey, baseURL });
}

// Primary Groq client. Created lazily so the module can be imported at build
// time before any API keys are available.
const getGroq = () => makeClient(process.env.GROQ_API_KEY, "https://api.groq.com/openai/v1");

// Secondary Groq client used when the primary Groq API is at its limit.
const getGroqBackup = () =>
  makeClient(process.env.GROQ_BACKUP_API_KEY, "https://api.groq.com/openai/v1");

// Backup provider (xAI / Grok). Used when the primary API is at its limit
// (HTTP 429 / rate_limit) so generation still succeeds.
const getGrokBackup = () =>
  makeClient(process.env.GROK_API_KEY, "https://api.x.ai/v1");

// Gemini (Google) provider. Uses Google's OpenAI-compatible endpoint.
const getGemini = () =>
  makeClient(
    process.env.GEMINI_API_KEY,
    "https://generativelanguage.googleapis.com/v1beta/openai/"
  );

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

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export async function generateFromPayload(
  payload: {
    model: string;
    temperature?: number;
    messages: ChatMessage[];
  },
  userId?: string
): Promise<string> {
  if (userId) {
    checkRateLimit(userId);
  }

  const isRateLimitError = (error: unknown): boolean => {
    const message = error instanceof Error ? error.message : String(error);
    return (
      message.includes("429") ||
      message.includes("rate_limit") ||
      message.includes("RESOURCE_EXHAUSTED")
    );
  };

  const providers: { name: string; client: OpenAI; model?: string }[] = [];
  if (process.env.GROQ_API_KEY) {
    providers.push({
      name: "groq",
      client: getGroq(),
      model: process.env.GROQ_MODEL || "groq/compound-mini",
    });
  }
  if (process.env.GROQ_BACKUP_API_KEY) {
    providers.push({
      name: "groq-backup",
      client: getGroqBackup(),
      model: process.env.GROQ_MODEL || "groq/compound-mini",
    });
  }
  if (process.env.GROK_API_KEY) {
    providers.push({
      name: "grok-backup",
      client: getGrokBackup(),
      model: process.env.GROK_MODEL || "grok-beta",
    });
  }
  if (process.env.GEMINI_API_KEY) {
    providers.push({
      name: "gemini",
      client: getGemini(),
      model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
    });
  }
  if (providers.length === 0) {
    throw new Error(
      "No AI API key configured. Set GROQ_API_KEY (primary), GROQ_BACKUP_API_KEY, GROK_API_KEY, or GEMINI_API_KEY."
    );
  }

  let lastError: Error | null = null;
  let firstError: Error | null = null;

  for (const provider of providers) {
    const maxRetries = 2;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await provider.client.chat.completions.create({
          model: provider.model || payload.model,
          messages: payload.messages,
          temperature: payload.temperature ?? 0.7,
          top_p: 0.9,
          max_tokens: 4096,
        });

        return result.choices[0].message.content ?? "";
      } catch (error) {
        lastError = error as Error;
        if (!firstError) firstError = lastError;

        // Transient rate limits: back off and retry on this provider.
        if (isRateLimitError(error) && attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt + 1) * 5000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // Any other failure (TPM/quota caps, unknown model, auth, etc.):
        // fall through to the next provider.
        break;
      }
    }
  }

  throw (
    firstError ||
    lastError ||
    new Error("Failed to generate lesson plan after retries on all providers")
  );
}

export async function generateLessonPlan(
  systemPrompt: string,
  userPrompt: string,
  userId?: string
): Promise<string> {
  return generateFromPayload(
    {
      model: MODEL_NAME,
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    },
    userId
  );
}
