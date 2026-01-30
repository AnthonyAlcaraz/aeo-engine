# AEO Engine — One Pager

## The Problem

AI engines (ChatGPT, Claude, Gemini, Perplexity) are replacing traditional search for millions of users. When someone asks "what's the best CRM tool?", the AI's answer determines who gets the customer. There is no reliable way to know whether your brand appears in those answers, how often, in what context, or what you can do to improve it.

## The Solution

AEO Engine is a self-hosted platform that systematically tracks your brand's visibility across AI models and generates content optimized to earn citations.

## How It Works

```
Define Brand + Competitors
        │
        ▼
  Create Probes ──────── "What are the best CRM tools?"
        │                 "Compare top sales platforms"
        ▼
  Run Against 4 LLMs ─── GPT-4o-mini, Claude Haiku, Gemini Flash, Perplexity Sonar
        │
        ▼
  Detect Citations ────── Cited? Position? Sentiment? Competitors mentioned?
        │
        ▼
  Dashboard ──────────── Track citation rate trends over 30+ days
        │
        ▼
  Generate Content ────── 3-stage AI pipeline → AEO-scored articles with JSON-LD
        │
        ▼
  Publish & Repeat ────── Kanban pipeline: Idea → Draft → Review → Published
```

## Core Capabilities

**Citation Tracking** — Query 4 LLM providers with probe templates (best-of, top-list, comparison, how-to, recommendation, alternative). 3-layer detection analyzes responses for brand mentions, URLs, sentiment, list position, and competitor presence. Each result gets a confidence score (0.5-1.0).

**Visibility Dashboard** — Citation rate trends by provider, share-of-voice pie chart, provider heatmap, and cost tracking. Filter by date range (default 30 days).

**Content Generation** — Research stage identifies key questions and structure. Draft stage produces markdown with clear headings, FAQ sections, and natural keyword integration. Schema stage generates JSON-LD structured data (Article, FAQPage, HowTo). Each piece scored 0-100 on AEO optimization factors.

**Content Pipeline** — Drag-and-drop Kanban board for managing content from ideation through publication.

## Architecture

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, TypeScript, Tailwind, Recharts, @dnd-kit |
| API | Next.js API routes with Zod validation |
| Database | Prisma + SQLite (swappable to Postgres) |
| LLM Integration | OpenAI, Anthropic, Google Generative AI, Perplexity |
| Cost Control | Per-provider rate limiter (100K tokens/min, $5/day cap) |
| Caching | SHA-256 keyed, 24h TTL for probes, 7d for content |

## Cost Profile

Probing uses cheap models by default. A full probe across 4 providers costs roughly $0.002-0.005. Running 10 probes daily across 4 providers costs under $2/month. Content generation with stronger models (GPT-4o, Claude Sonnet) costs $0.05-0.15 per article.

## Quick Start

```bash
git clone https://github.com/AnthonyAlcaraz/aeo-engine.git
cd aeo-engine
npm install
# Add API keys to .env (at least one provider)
npx prisma db push
npm run dev
```

## What's Next

- Scheduled monitoring (node-cron for daily/weekly automated probes)
- Alert system (citation gained/lost, competitor changes, sentiment shifts)
- WordPress publishing integration
- Historical comparison (before/after content publication)
- Batch probe execution across all active probes
