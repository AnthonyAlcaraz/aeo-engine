import {
  type LLMRequest,
  type LLMResponse,
  COST_PER_QUERY,
} from "./index";

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
  raw_content?: string;
}

interface TavilyResponse {
  query: string;
  answer?: string;
  results: TavilyResult[];
  response_time: number;
}

// Tavily is a search-native provider: it searches the live web and returns
// an LLM-generated answer with source citations. Unlike LLM providers that
// optionally search, Tavily always searches — making it a pure web search baseline.
export async function queryTavily(request: LLMRequest): Promise<LLMResponse> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "TAVILY_API_KEY is not set. Please add it to your environment variables."
    );
  }

  const start = Date.now();

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query: request.prompt,
      search_depth: "advanced",
      include_answer: true,
      max_results: 10,
      include_raw_content: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
  }

  const data: TavilyResponse = await response.json();
  const latencyMs = Date.now() - start;

  // Compose response text: Tavily's LLM answer + source list
  const sourceList = data.results
    .slice(0, 5)
    .map((r, i) => `[${i + 1}] ${r.title} - ${r.url}\n${r.content}`)
    .join("\n\n");

  const text = data.answer
    ? `${data.answer}\n\nSources:\n${sourceList}`
    : sourceList;

  // Tavily uses per-query pricing, no token-based costs
  const cost = COST_PER_QUERY["tavily-advanced"] ?? 0.016;

  return {
    text,
    tokensIn: 0,
    tokensOut: 0,
    latencyMs,
    cost,
    model: "tavily-search",
    provider: "tavily",
  };
}
