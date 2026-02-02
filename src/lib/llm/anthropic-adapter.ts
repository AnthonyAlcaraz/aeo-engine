import Anthropic from "@anthropic-ai/sdk";
import {
  type LLMRequest,
  type LLMResponse,
  DEFAULT_MODELS,
  calculateCost,
  SEARCH_CALL_COST,
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

  // Enable native web search tool so Claude retrieves live web results
  // This mirrors how real users interact with Claude (search enabled by default)
  // Uses Brave Search as backend, returns inline citations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createParams: any = {
    model,
    max_tokens: request.maxTokens ?? 1024,
    system: request.systemPrompt ?? "",
    messages: [{ role: "user", content: request.prompt }],
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 3,
      },
    ],
  };

  const response = await client.messages.create(createParams);

  const latencyMs = Date.now() - start;

  const tokensIn = response.usage.input_tokens;
  const tokensOut = response.usage.output_tokens;

  // Extract text from all text blocks (search responses may have multiple)
  const textBlocks = response.content.filter(
    (block) => block.type === "text"
  );
  const text = textBlocks
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n");

  // Count search requests for cost calculation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usage = response.usage as any;
  const searchRequests =
    usage?.server_tool_use?.web_search_requests ?? 0;
  const searchCost = searchRequests * (SEARCH_CALL_COST["anthropic-web-search"] ?? 0);
  const tokenCost = calculateCost(model, tokensIn, tokensOut);

  return {
    text,
    tokensIn,
    tokensOut,
    latencyMs,
    cost: tokenCost + searchCost,
    model,
    provider: "anthropic",
  };
}
