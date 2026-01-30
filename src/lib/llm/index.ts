import { queryOpenAI } from "./openai-adapter";
import { queryAnthropic } from "./anthropic-adapter";
import { queryGoogle } from "./google-adapter";
import { queryPerplexity } from "./perplexity-adapter";

export type LLMProvider = "openai" | "anthropic" | "google" | "perplexity";

export interface LLMRequest {
  provider: LLMProvider;
  model?: string;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  text: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  cost: number;
  model: string;
  provider: LLMProvider;
}

export const DEFAULT_MODELS: Record<LLMProvider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-haiku-latest",
  google: "gemini-2.0-flash",
  perplexity: "sonar",
};

export const COST_PER_1K_TOKENS: Record<
  string,
  { input: number; output: number }
> = {
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "claude-3-5-haiku-latest": { input: 0.0008, output: 0.004 },
  "gemini-2.0-flash": { input: 0.0001, output: 0.0004 },
  sonar: { input: 0.001, output: 0.001 },
};

export function calculateCost(
  model: string,
  tokensIn: number,
  tokensOut: number
): number {
  const costs = COST_PER_1K_TOKENS[model];
  if (!costs) return 0;
  return (tokensIn / 1000) * costs.input + (tokensOut / 1000) * costs.output;
}

const PROVIDER_API_KEY_MAP: Record<LLMProvider, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_API_KEY",
  perplexity: "PERPLEXITY_API_KEY",
};

export function getEnabledProviders(): LLMProvider[] {
  const providers: LLMProvider[] = ["openai", "anthropic", "google", "perplexity"];
  return providers.filter(
    (provider) => !!process.env[PROVIDER_API_KEY_MAP[provider]]
  );
}

export async function queryLLM(request: LLMRequest): Promise<LLMResponse> {
  switch (request.provider) {
    case "openai":
      return queryOpenAI(request);
    case "anthropic":
      return queryAnthropic(request);
    case "google":
      return queryGoogle(request);
    case "perplexity":
      return queryPerplexity(request);
    default: {
      const exhaustiveCheck: never = request.provider;
      throw new Error(`Unknown provider: ${exhaustiveCheck}`);
    }
  }
}
