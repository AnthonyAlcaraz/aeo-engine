import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import {
  type LLMRequest,
  type LLMResponse,
  DEFAULT_MODELS,
  calculateCost,
} from "./index";

export async function queryPerplexity(
  request: LLMRequest
): Promise<LLMResponse> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "PERPLEXITY_API_KEY is not set. Please add it to your environment variables."
    );
  }

  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.perplexity.ai",
  });

  const model = request.model ?? DEFAULT_MODELS.perplexity;

  const messages: ChatCompletionMessageParam[] = [];
  if (request.systemPrompt) {
    messages.push({ role: "system", content: request.systemPrompt });
  }
  messages.push({ role: "user", content: request.prompt });

  const start = Date.now();

  const response = await client.chat.completions.create({
    model,
    messages,
    temperature: request.temperature ?? 0.7,
    max_tokens: request.maxTokens,
  });

  const latencyMs = Date.now() - start;

  const tokensIn = response.usage?.prompt_tokens ?? 0;
  const tokensOut = response.usage?.completion_tokens ?? 0;
  const text = response.choices[0]?.message?.content ?? "";

  return {
    text,
    tokensIn,
    tokensOut,
    latencyMs,
    cost: calculateCost(model, tokensIn, tokensOut),
    model,
    provider: "perplexity",
  };
}
