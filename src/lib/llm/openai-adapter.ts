import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import {
  type LLMRequest,
  type LLMResponse,
  DEFAULT_MODELS,
  calculateCost,
  SEARCH_CALL_COST,
} from "./index";

const SEARCH_MODELS = ["gpt-4o-mini-search-preview", "gpt-4o-search-preview", "gpt-5-search-api"];

export async function queryOpenAI(request: LLMRequest): Promise<LLMResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Please add it to your environment variables."
    );
  }

  const client = new OpenAI({ apiKey });
  const model = request.model ?? DEFAULT_MODELS.openai;
  const isSearchModel = SEARCH_MODELS.includes(model);

  const messages: ChatCompletionMessageParam[] = [];
  if (request.systemPrompt) {
    messages.push({ role: "system", content: request.systemPrompt });
  }
  messages.push({ role: "user", content: request.prompt });

  const start = Date.now();

  // Search-enabled models use web_search_options to query live web results
  // This mirrors how real users interact with ChatGPT (search enabled by default)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createParams: any = {
    model,
    messages,
    temperature: request.temperature ?? 0.7,
    max_tokens: request.maxTokens,
  };

  if (isSearchModel) {
    createParams.web_search_options = {};
  }

  const response = await client.chat.completions.create(createParams);

  const latencyMs = Date.now() - start;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = response as any;
  const tokensIn = res.usage?.prompt_tokens ?? 0;
  const tokensOut = res.usage?.completion_tokens ?? 0;
  const text = res.choices?.[0]?.message?.content ?? "";

  // Search models have per-call cost in addition to token cost
  const tokenCost = calculateCost(model, tokensIn, tokensOut);
  const searchCost = isSearchModel ? (SEARCH_CALL_COST[model] ?? 0) : 0;

  return {
    text,
    tokensIn,
    tokensOut,
    latencyMs,
    cost: tokenCost + searchCost,
    model,
    provider: "openai",
  };
}
