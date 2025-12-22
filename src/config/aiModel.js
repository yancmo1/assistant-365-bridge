/**
 * Centralized AI model configuration.
 *
 * 2025-12-22: Default model updated to `gpt-5.2`.
 *
 * Compatibility note:
 * - This repo does not currently ship with an OpenAI SDK client.
 * - When an OpenAI/ChatGPT client is added, it should read the model from here
 *   to ensure all chat/task automation uses the same model identifier.
 */

const DEFAULT_MODEL = 'gpt-5.2';

function firstNonEmptyString(...values) {
  for (const v of values) {
    if (typeof v === 'string') {
      const trimmed = v.trim();
      if (trimmed.length) return trimmed;
    }
  }
  return null;
}

const rawModel = firstNonEmptyString(
  process.env.OPENAI_MODEL,
  // Back-compat / legacy naming:
  process.env.MODEL_VERSION
);

export const OPENAI_MODEL = rawModel || DEFAULT_MODEL;

export const OPENAI_MODEL_SOURCE = rawModel
  ? (process.env.OPENAI_MODEL ? 'OPENAI_MODEL' : 'MODEL_VERSION')
  : 'default';

export function getOpenAiModelInfo() {
  return {
    model: OPENAI_MODEL,
    source: OPENAI_MODEL_SOURCE
  };
}
