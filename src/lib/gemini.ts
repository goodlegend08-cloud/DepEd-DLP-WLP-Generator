import OpenAI from "openai";

function makeClient(apiKey: string | undefined, baseURL: string): OpenAI {
  // maxRetries: 0 disables the SDK's hidden retry/backoff so failover between
  // providers happens fast instead of waiting on each failing provider.
  return new OpenAI({ apiKey, baseURL, maxRetries: 0 });
}

// Primary Groq client. Created lazily so the module can be imported at build
// time before any API keys are available.
const getGroq = () => makeClient(process.env.GROQ_API_KEY, "https://api.groq.com/openai/v1");

// Secondary Groq client used when the primary Groq API is at its limit.
const getGroqBackup = () =>
  makeClient(process.env.GROQ_BACKUP_API_KEY, "https://api.groq.com/openai/v1");

// OpenRouter provider. Aggregates many models; free variants use the ":free"
// suffix (e.g. openai/gpt-oss-20b:free).
const getOpenRouter = () =>
  makeClient(process.env.OPENROUTER_API_KEY, "https://openrouter.ai/api/v1");

// Gemini (Google) provider. Uses Google's OpenAI-compatible endpoint.
const getGemini = () =>
  makeClient(
    process.env.GEMINI_API_KEY,
    "https://generativelanguage.googleapis.com/v1beta/openai/"
  );

// Together AI provider. OpenAI-compatible endpoint.
const getTogether = () =>
  makeClient(process.env.TOGETHER_API_KEY, "https://api.together.xyz/v1");

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

export interface GenerationResult {
  content: string;
  provider: string;
  model: string;
}

export interface ProviderStatus {
  provider: string;
  model: string;
  status: "trying" | "failed" | "succeeded";
  error?: string;
}

export async function generateFromPayload(
  payload: {
    model: string;
    temperature?: number;
    messages: ChatMessage[];
  },
  userId?: string,
  onStatus?: (status: ProviderStatus) => void
): Promise<GenerationResult> {
  if (userId) {
    checkRateLimit(userId);
  }

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
  if (process.env.OPENROUTER_API_KEY) {
    providers.push({
      name: "openrouter",
      client: getOpenRouter(),
      model: process.env.OPENROUTER_MODEL || "z-ai/glm-5.2:free",
    });
  }
  if (process.env.GEMINI_API_KEY) {
    providers.push({
      name: "gemini",
      client: getGemini(),
      model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
    });
  }
  // Extra Gemini keys as backups — rotate through them when quota runs out.
  const geminiBackups: { env: string; name: string }[] = [
    { env: "GEMINI_API_KEY_2", name: "gemini-2" },
    { env: "GEMINI_API_KEY_3", name: "gemini-3" },
    { env: "GEMINI_API_KEY_4", name: "gemini-4" },
  ];
  for (const backup of geminiBackups) {
    if (process.env[backup.env]) {
      providers.push({
        name: backup.name,
        client: makeClient(
          process.env[backup.env],
          "https://generativelanguage.googleapis.com/v1beta/openai/"
        ),
        model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
      });
    }
  }
  if (process.env.TOGETHER_API_KEY) {
    providers.push({
      name: "together",
      client: getTogether(),
      model:
        process.env.TOGETHER_MODEL || "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
    });
  }
  if (providers.length === 0) {
    throw new Error(
      "No AI API key configured. Set GROQ_API_KEY (primary), GROQ_BACKUP_API_KEY, OPENROUTER_API_KEY, GEMINI_API_KEY, or TOGETHER_API_KEY."
    );
  }

  let lastError: Error | null = null;
  let firstError: Error | null = null;

  for (const provider of providers) {
    const model = provider.model || payload.model;
    try {
      onStatus?.({ provider: provider.name, model, status: "trying" });
      const result = await provider.client.chat.completions.create({
        model,
        messages: payload.messages,
        temperature: payload.temperature ?? 0.7,
        top_p: 0.9,
        max_tokens: 8192,
      });

      const content = result.choices[0].message.content ?? "";
      if (!content.trim()) {
        // Some models (e.g. reasoning models) can return 200 with no content
        // if they burn their token budget on "thinking". Treat as failure and
        // fall through to the next provider.
        const emptyError = new Error(
          "Provider returned an empty response (tokens consumed on reasoning?)"
        );
        lastError = emptyError;
        if (!firstError) firstError = emptyError;
        onStatus?.({ provider: provider.name, model, status: "failed", error: emptyError.message });
        continue;
      }

      onStatus?.({ provider: provider.name, model, status: "succeeded" });
      return {
        content,
        provider: provider.name,
        model,
      };
    } catch (error) {
      lastError = error as Error;
      if (!firstError) firstError = lastError;
      onStatus?.({
        provider: provider.name,
        model,
        status: "failed",
        error: lastError.message,
      });
      // Any failure (rate limit, TPM/quota, unknown model, auth, etc.) falls
      // through to the next provider immediately — no backoff, so a broken
      // provider never stalls generation.
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
  userId?: string,
  onStatus?: (status: ProviderStatus) => void
): Promise<GenerationResult> {
  return generateFromPayload(
    {
      model: MODEL_NAME,
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    },
    userId,
    onStatus
  );
}
