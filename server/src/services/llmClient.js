/**
 * LLM Client — provider-agnostic chat-completion client.
 *
 * Uses Node 18+'s global fetch (no extra dependency). Targets the Sarvam AI
 * Chat Completions API (https://api.sarvam.ai/v1/chat/completions) by default,
 * which is OpenAI-compatible. A `generic` provider is also supported for any
 * OpenAI-compatible endpoint set via LLM_BASE_URL.
 *
 * This client has NO database access and never generates or executes SQL.
 * It only builds the HTTP request, sends the system prompt + grounded context
 * + question, and returns the model's answer string.
 *
 * Env vars:
 *   LLM_PROVIDER  "sarvam" (default) | "generic"
 *   LLM_API_KEY   API subscription key (sk_... for Sarvam)
 *   LLM_MODEL     "sarvam-30b" (default) | "sarvam-105b" | <any model id>
 *   LLM_BASE_URL  "https://api.sarvam.ai" (default)
 *   LLM_TIMEOUT_MS 30000 (default)
 */

const DEFAULT_BASE_URL = 'https://api.sarvam.ai';
const DEFAULT_MODEL = 'sarvam-30b';
const DEFAULT_TIMEOUT_MS = 30000;

function getConfig() {
  return {
    provider: process.env.LLM_PROVIDER || 'sarvam',
    apiKey: process.env.LLM_API_KEY || '',
    model: process.env.LLM_MODEL || DEFAULT_MODEL,
    baseUrl: process.env.LLM_BASE_URL || DEFAULT_BASE_URL,
    timeoutMs: parseInt(process.env.LLM_TIMEOUT_MS, 10) || DEFAULT_TIMEOUT_MS,
  };
}

/**
 * Low-level call to the chat-completions endpoint.
 *
 * @param {object} opts
 * @param {string} opts.systemPrompt
 * @param {string} opts.userPrompt  Pre-built user message (context + question).
 * @param {number} [opts.temperature]
 * @returns {Promise<{answer: string, usage: object|null, error: string|null}>}
 */
async function chatCompletion({ systemPrompt, userPrompt, temperature = 0.3 }) {
  const cfg = getConfig();

  if (!cfg.apiKey) {
    return {
      answer: null,
      usage: null,
      error:
        'LLM is not configured. Set LLM_API_KEY (and optionally LLM_PROVIDER, LLM_MODEL) on the backend to enable AI features.',
    };
  }

  const url = `${cfg.baseUrl.replace(/\/$/, '')}/v1/chat/completions`;
  const body = {
    model: cfg.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature,
    max_tokens: 4096,
    frequency_penalty: 0.5,
    presence_penalty: 0.5,
  };

  // Sarvam prefers the api-subscription-key header; the generic provider uses
  // standard Bearer auth. Both are accepted by Sarvam, but we follow the docs.
  const headers = {
    'Content-Type': 'application/json',
  };
  if (cfg.provider === 'sarvam') {
    headers['api-subscription-key'] = cfg.apiKey;
  } else {
    headers['Authorization'] = `Bearer ${cfg.apiKey}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      let detail = '';
      try {
        const errBody = await res.json();
        detail = errBody?.error?.message || errBody?.message || '';
      } catch {
        detail = await res.text().catch(() => '');
      }

      if (res.status === 403) {
        return {
          answer: null,
          usage: null,
          error: 'LLM authentication failed (403). The configured LLM_API_KEY is missing, invalid, or not authorized.',
        };
      }
      if (res.status === 429) {
        return {
          answer: null,
          usage: null,
          error: 'LLM rate limit or quota exceeded (429). Please retry shortly or check your Sarvam plan credits.',
        };
      }
      return {
        answer: null,
        usage: null,
        error: `LLM request failed (${res.status}). ${detail}`.trim(),
      };
    }

    const data = await res.json();
    let answer = data?.choices?.[0]?.message?.content || null;
    
    // Fallback: If it's a reasoning model that ran out of tokens or only generated reasoning
    if (!answer && data?.choices?.[0]?.message?.reasoning_content) {
      answer = data.choices[0].message.reasoning_content;
    }

    if (!answer) {
      return { answer: null, usage: data?.usage ?? null, error: 'The model returned an empty response.' };
    }

    return { answer: answer.trim(), usage: data?.usage ?? null, error: null };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { answer: null, usage: null, error: 'LLM request timed out. Please try again.' };
    }
    return { answer: null, usage: null, error: `LLM request error: ${err.message}` };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Build the user message: a fenced JSON context block followed by the question.
 * @param {object} contextSummary
 * @param {string} question
 */
function buildUserPrompt(contextSummary, question) {
  return [
    'Use ONLY the following JSON context to answer the question. Do not invent data.',
    '```json',
    JSON.stringify(contextSummary),
    '```',
    '',
    `Question: ${question}`,
  ].join('\n');
}

/**
 * Ops Copilot call — role-aware Q&A over live fleet data.
 *
 * @param {object} opts
 * @param {string} opts.role
 * @param {string} opts.systemPrompt
 * @param {object} opts.contextSummary
 * @param {string} opts.question
 * @returns {Promise<{answer: string|null, usage: object|null, error: string|null}>}
 */
async function callOpsCopilot({ role, systemPrompt, contextSummary, question }) {
  const userPrompt = buildUserPrompt(contextSummary, question);
  return chatCompletion({ systemPrompt, userPrompt, temperature: 0.3 });
}

/**
 * Anomaly explainer call — explains why a metric looks off for one vehicle.
 *
 * @param {object} opts
 * @param {string} opts.systemPrompt
 * @param {object} opts.contextSummary
 * @param {string} opts.question
 * @returns {Promise<{answer: string|null, usage: object|null, error: string|null}>}
 */
async function callAnomalyExplainer({ systemPrompt, contextSummary, question }) {
  const userPrompt = buildUserPrompt(contextSummary, question);
  // Slightly higher temperature for a more narrative explanation.
  return chatCompletion({ systemPrompt, userPrompt, temperature: 0.4 });
}

module.exports = {
  callOpsCopilot,
  callAnomalyExplainer,
  // Exposed for tests / health checks.
  getConfig,
};