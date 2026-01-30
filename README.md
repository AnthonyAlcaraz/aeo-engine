# AEO Engine

Self-hosted AI Engine Optimization platform. Tracks how often AI models (ChatGPT, Claude, Gemini, Perplexity) cite your brand, generates citation-optimized content, and monitors visibility trends over time.

## What it does

1. **Citation Tracking** — Send probe queries to 4 LLM providers simultaneously and detect whether your brand appears in responses. Measures citation type, sentiment, list position, confidence score, and competitor mentions.

2. **Content Generation** — 3-stage AI pipeline (research, draft, schema markup) that produces content optimized for AI engine citations, with automatic JSON-LD structured data and an AEO score (0-100).

3. **Visibility Dashboard** — Track citation rates over time by provider, share-of-voice breakdown, provider heatmap, and cost tracking across all API calls.

4. **Content Pipeline** — Kanban board to manage content from idea through draft, review, and publication.

## Stack

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Recharts, @dnd-kit
- **Backend:** Next.js API routes, Prisma ORM
- **Database:** SQLite (swappable to Postgres via Prisma)
- **LLM Providers:** OpenAI, Anthropic, Google Generative AI, Perplexity

## Setup

```bash
git clone https://github.com/AnthonyAlcaraz/aeo-engine.git
cd aeo-engine
npm install
```

Copy `.env` and add your API keys:

```env
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
GOOGLE_AI_API_KEY="AI..."
PERPLEXITY_API_KEY="pplx-..."
```

You only need at least one provider key to start. The system auto-detects which providers are available.

Initialize the database and start:

```bash
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Workflow

### 1. Create a Brand

Navigate to **Brand Kit** and add your brand with:
- Name and domain
- Target keywords (comma-separated)
- Competitors (name + domain pairs)

Competitors are tracked alongside your brand in every probe run, so you can see who gets cited instead of you.

### 2. Create Probes

Navigate to **Probes** and create citation test queries. Each probe has a category that shapes the prompt template sent to LLMs:

| Category | Prompt Pattern |
|----------|---------------|
| `best-of` | "What are the best {query}?" |
| `top-list` | "What are the top 10 {query}? Rank them." |
| `comparison` | "Compare the leading {query}." |
| `how-to` | "How do I choose the right {query}?" |
| `recommendation` | "I need a recommendation for {query}." |
| `alternative` | "What are the best alternatives for {query}?" |

### 3. Run Probes

Click **Run** on any probe. The system:

1. Builds the prompt from your query + category template
2. Sends it to all enabled LLM providers (GPT-4o-mini, Claude 3.5 Haiku, Gemini 2.0 Flash, Sonar)
3. Runs 3-layer citation detection on each response:
   - **URL matching** (confidence 1.0) — finds links to your domain
   - **Name matching** (confidence 0.9) — exact brand name with word boundaries
   - **Domain matching** (confidence 0.5) — domain text mentioned without URL
4. Analyzes sentiment around brand mentions (positive/neutral/negative)
5. Detects list position if the response contains a ranked list
6. Identifies which competitors were mentioned
7. Stores all results with cost and latency tracking

### 4. Review Results

Navigate to **Probes → [probe] → Results** to see:
- Per-provider response breakdown with cited/not-cited indicators
- Citation type (direct mention, URL link, recommendation, comparison)
- Sentiment badges and confidence bars
- Which competitors appeared in each response

### 5. Generate Content

Navigate to **Content → Generate Content** to create AEO-optimized articles:

**Stage 1 — Research:** Identifies key questions people ask, relevant facts, and optimal structure for AI engine citation.

**Stage 2 — Draft:** Produces full markdown content with clear headings, direct answers, FAQ sections, and natural keyword integration.

**Stage 3 — Schema:** Generates JSON-LD structured data (Article, FAQPage, or HowTo) based on content type. Merges schemas when FAQ content appears in non-FAQ articles.

Each piece gets an **AEO Score** (0-100) based on:

| Factor | Points |
|--------|--------|
| Schema markup present | +20 |
| Direct answer paragraphs (3+) | +20 |
| FAQ section | +15 |
| Keyword density 1-3% | +15 |
| Clear headings (3+) | +10 |
| Structured lists | +10 |
| Brand mentions (2-6) | +10 |

### 6. Manage Content Pipeline

The **Content** page has a Kanban board with drag-and-drop columns:

**Idea → Draft → Review → Published**

Drag content cards between columns to update their status. Switch to list view for a table overview.

### 7. Monitor Dashboard

The **Dashboard** shows:
- **Stat cards:** Total probes, citation runs, citation rate %, total cost
- **Trend chart:** Citation rate per provider over the last 30 days
- **Share of voice:** Pie chart of cited vs. not-cited responses
- **Provider heatmap:** Color-coded citation rates (green >70%, yellow 40-70%, red <40%)

## Architecture

```
src/
├── app/
│   ├── (app)/                    # App shell with sidebar
│   │   ├── dashboard/page.tsx    # Analytics dashboard
│   │   ├── brand/page.tsx        # Brand management
│   │   ├── probes/page.tsx       # Probe management
│   │   ├── probes/[id]/results/  # Probe results
│   │   └── content/page.tsx      # Content pipeline + Kanban
│   ├── api/
│   │   ├── brand/                # Brand CRUD
│   │   ├── probes/               # Probe CRUD
│   │   ├── citations/probe/      # Probe execution engine
│   │   ├── content/              # Content CRUD + generation
│   │   └── dashboard/            # Stats + trends aggregation
│   └── page.tsx                  # Redirect to /dashboard
├── components/
│   ├── layout/                   # Sidebar + app shell
│   └── ui/                       # Button, Card, Input, Select, etc.
├── lib/
│   ├── llm/                      # Unified LLM client
│   │   ├── index.ts              # Interface + factory + cost calculation
│   │   ├── openai-adapter.ts     # OpenAI SDK adapter
│   │   ├── anthropic-adapter.ts  # Anthropic SDK adapter
│   │   ├── google-adapter.ts     # Google Generative AI adapter
│   │   └── perplexity-adapter.ts # Perplexity (OpenAI-compatible) adapter
│   ├── citation/
│   │   ├── detector.ts           # 3-layer citation detection
│   │   └── prompt-builder.ts     # 6 probe prompt templates
│   ├── content/
│   │   ├── generator.ts          # 3-stage content generation
│   │   └── schema-markup.ts      # JSON-LD generation + markdown parsing
│   ├── monitoring/
│   │   ├── rate-limiter.ts       # Per-provider token bucket + daily cost caps
│   │   └── cache.ts              # SHA-256 keyed cache (24h probes, 7d content)
│   ├── db/index.ts               # Prisma client singleton
│   └── utils.ts                  # cn(), formatCurrency, truncate, slugify
└── prisma/
    └── schema.prisma             # 11 models
```

## API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/brand` | GET | List brands with probe/run counts |
| `/api/brand` | POST | Create brand |
| `/api/brand/[id]` | GET/PUT/DELETE | Brand CRUD |
| `/api/probes` | GET | List probes (filter by `?brandId=`) |
| `/api/probes` | POST | Create probe |
| `/api/probes/[id]` | GET/PUT/DELETE | Probe CRUD |
| `/api/citations/probe` | POST | Execute probe across providers |
| `/api/content` | GET | List content (filter by `?brandId=` `?status=`) |
| `/api/content` | POST | Create content manually |
| `/api/content/[id]` | GET/PUT/DELETE | Content CRUD |
| `/api/content/generate` | POST | Generate AEO content (3-stage) |
| `/api/dashboard/stats` | GET | Aggregated citation stats |
| `/api/dashboard/trends` | GET | Daily trends (param: `?days=30`) |

## Default Models

Probing uses cheap, fast models to control costs:

| Provider | Model | Input $/1K tokens | Output $/1K tokens |
|----------|-------|-------------------|-------------------|
| OpenAI | gpt-4o-mini | $0.00015 | $0.0006 |
| Anthropic | claude-3-5-haiku-latest | $0.0008 | $0.004 |
| Google | gemini-2.0-flash | $0.0001 | $0.0004 |
| Perplexity | sonar | $0.001 | $0.001 |

Content generation uses stronger models (gpt-4o, claude-sonnet-4).

## Rate Limiting

Per-provider defaults (in-memory, resets automatically):

- **100,000 tokens/minute** per provider
- **60 requests/minute** per provider
- **$5.00/day** cost cap per provider

## Database

SQLite by default for zero-config local development. To switch to Postgres, change the datasource in `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Then update `DATABASE_URL` and run `npx prisma db push`.

## License

Private.
