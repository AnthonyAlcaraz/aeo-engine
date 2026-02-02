AEO tools charge $300/month to probe ChatGPT and check if your brand shows up.
I built the same thing open source for $2/month in API costs.

Gartner predicts traditional search drops 25% by end of 2026. Traffic from AI answers grew 527% year-over-year. Visitors from ChatGPT and Perplexity convert 4.4x better than traditional organic search. When someone asks "what's the best CRM tool?", the AI answer now determines who gets the customer.

The industry responded with AEO (Answer Engine Optimization) tools. HubSpot launched an AEO Grader. Profound monitors 10+ AI engines. Otterly has 15,000 users. G2 created an AEO category. Pricing: $200 to $500/month.

The problem: most of these tools query raw LLMs without search enabled, scan the response for your brand name, show a dashboard. That tests what the model memorized during training. Real users interact with ChatGPT Search (Bing), Claude with web search (Brave), Gemini with grounding (Google Search), and Perplexity with live citations.

AEO Engine probes all 5 providers with live web search enabled:

1. OpenAI Search Preview — queries Bing's index via web_search_options
2. Claude with native web search — uses Brave Search via the web_search_20250305 tool
3. Gemini with Google Search grounding — hits Google's production search index
4. Perplexity Sonar — searches Bing + Google + its own crawler index
5. Tavily — AI search aggregator pulling from 20+ web sources

Every provider searches the live internet. No raw LLM baselines. Tests what users actually see.

3-layer citation detection: URL matching (confidence 1.0), exact name matching (0.9), domain matching (0.5). 3-component scoring: Citation Validation at 50%, Competitive Gap at 30%, Structural Analysis at 20%. Competitive analysis with SWOT profiles. Content optimization from real probe data.

Total cost: ~$0.06 per probe across 5 providers. Ten probes daily under $20/month.

The deeper insight: AI engines find brands through search indexes (Bing, Google, Brave), not training data. Entity resolution, schema markup, and consistent naming across sources determine whether you get cited. Structured knowledge wins in agent systems. Structured knowledge wins in AI search.

The repo: github.com/AnthonyAlcaraz/aeo-engine

Next.js 15, Prisma, 22 API routes, 5 search-enabled providers. Clone it, add one API key, run it.

**Resources:**
- Agentic Graph RAG (O'Reilly): oreilly.com/library/view/agentic-graph-rag/9798341623163/
- AEO Engine: github.com/AnthonyAlcaraz/aeo-engine
- Princeton GEO Research: arxiv.org/abs/2311.09735
- HubSpot AEO Trends 2026: blog.hubspot.com/marketing/answer-engine-optimization-trends
