import Anthropic from "@anthropic-ai/sdk";
import {
  type LLMRequest,
  type LLMResponse,
  DEFAULT_MODELS,
  calculateCost,
} from "./index";

export async function queryAnthropic(
  request: LLMRequest
): Promise<LLMResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Please add it to your environment variables."
    );
  }

  const client = new Anthropic({ apiKey });
  const model = request.model ?? DEFAULT_MODELS.anthropic;

  const start = Date.now();

  const response = await client.messages.create({
    model,
    max_tokens: request.maxTokens ?? 1024,
    temperature: request.temperature ?? 0.7,
    system: request.systemPrompt ?? "",
    messages: [{ role: "user", content: request.prompt }],
  });

  const latencyMs = Date.now() - start;

  const tokensIn = response.usage.input_tokens;
  const tokensOut = response.usage.output_tokens;

  const textBlock = response.content.find((block) => block.type === "text");
  const text = textBlock && textBlock.type === "text" ? textBlock.text : "";

  return {
    text,
    tokensIn,
    tokensOut,
    latencyMs,
    cost: calculateCost(model, tokensIn, tokensOut),
    model,
    provider: "anthropic",
  };
}
