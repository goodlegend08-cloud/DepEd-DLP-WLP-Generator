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
  attempt?: number;
  total?: number;
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
    const openrouterClient = getOpenRouter();
    providers.push({
      name: "openrouter",
      client: openrouterClient,
      model: process.env.OPENROUTER_MODEL || "z-ai/glm-5.2:free",
    });
    providers.push({
      name: "openrouter-nemotron",
      client: openrouterClient,
      model: "nvidia/nemotron-3-ultra-550b-a55b:free",
    });
    providers.push({
      name: "openrouter-nemotron-super",
      client: openrouterClient,
      model: "nvidia/nemotron-3-super-120b-a12b:free",
    });
    providers.push({
      name: "openrouter-cohere",
      client: openrouterClient,
      model: "cohere/north-mini-code:free",
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
  if (providers.length === 0) {
    throw new Error(
      "No AI API key configured. Set GROQ_API_KEY (primary), GROQ_BACKUP_API_KEY, OPENROUTER_API_KEY, or GEMINI_API_KEY."
    );
  }

let lastError: Error | null = null;
  let firstError: Error | null = null;

  // "No room for errors": if every provider fails in a pass, loop the whole
  // chain again. Transient failures (rate limits, TPM/quota, 5xx) often clear
  // after a short wait, so a plan should almost never come back as a hard
  // failure. MAX_GENERATION_PASSES caps the total so a full outage eventually
  // reports instead of hanging forever.
  const maxPasses = Math.max(
    1,
    parseInt(process.env.MAX_GENERATION_PASSES || "3", 10) || 3
  );
  const passDelayMs = Math.max(0, parseInt(process.env.GENERATION_PASS_DELAY_MS || "2000", 10) || 2000);
  const totalAttempts = providers.length * maxPasses;
  let attempt = 0;

  for (let pass = 0; pass < maxPasses; pass++) {
    if (pass > 0) {
      await new Promise((r) => setTimeout(r, passDelayMs));
    }

    // Parallel race: fire every provider at once and take the first one that
    // returns usable content. Generation finishes in the fastest provider's
    // time instead of the slowest. The pass loop above still retries the whole
    // chain if every provider fails, so reliability is unchanged.
    const attempts = providers.map((provider) => {
      const model = provider.model || payload.model;
      attempt += 1;
      const currentAttempt = attempt;
      onStatus?.({
        provider: provider.name,
        model,
        status: "trying",
        attempt: currentAttempt,
        total: totalAttempts,
      });

      return (async (): Promise<GenerationResult> => {
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
          // if they burn their token budget on "thinking". Treat as failure so
          // the race keeps waiting for a provider that returns real content.
          throw new Error(
            "Provider returned an empty response (tokens consumed on reasoning?)"
          );
        }

        return { content, provider: provider.name, model };
      })()
        .then((result) => {
          onStatus?.({
            provider: provider.name,
            model,
            status: "succeeded",
            attempt: currentAttempt,
            total: totalAttempts,
          });
          return result;
        })
        .catch((error) => {
          const err = error as Error;
          lastError = err;
          if (!firstError) firstError = err;
          onStatus?.({
            provider: provider.name,
            model,
            status: "failed",
            error: err.message,
            attempt: currentAttempt,
            total: totalAttempts,
          });
          throw err;
        });
    });

    // First success wins. If every provider fails this pass, Promise.any
    // rejects and we retry the whole chain on the next pass.
    const winner = await Promise.any(attempts).catch(() => null);
    if (winner) {
      return winner;
    }
  }

  throw (
    firstError ||
    lastError ||
    new Error(`Failed to generate lesson plan after ${totalAttempts} attempts across all providers`)
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
