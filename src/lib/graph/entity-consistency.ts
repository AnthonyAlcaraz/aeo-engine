/**
 * Entity Consistency Checker
 *
 * Based on "Be The Answer" principle: AI engines trust brands with clear entity structures.
 * Entity consistency = identical information about name, services, pricing, categories
 * across all channels that AI systems index.
 *
 * This module:
 * 1. Detects naming variations across AI providers
 * 2. Identifies inconsistencies in how the brand is described
 * 3. Provides recommendations for entity standardization
 * 4. Tracks entity trust score over time
 *
 * Uses the KuzuDB knowledge graph to aggregate entity mentions from probe results.
 */

import { getKnowledgeGraph } from "./knowledge-graph";
import { queryLLM } from "@/lib/llm";

// ─── Types ───

export interface EntityConsistencyReport {
  overallScore: number; // 0-100
  brandName: BrandNameAnalysis;
  productNames: ProductNameAnalysis[];
  descriptions: DescriptionConsistency;
  categories: CategoryConsistency;
  recommendations: string[];
  lastUpdated: string;
}

export interface BrandNameAnalysis {
  canonical: string;
  variations: VariationInstance[];
  consistencyScore: number;
  recommendation: string | null;
}

export interface VariationInstance {
  variation: string;
  provider: string;
  frequency: number;
  context: string; // How it was used
}

export interface ProductNameAnalysis {
  canonical: string;
  variations: VariationInstance[];
  consistencyScore: number;
}

export interface DescriptionConsistency {
  score: number;
  descriptions: ProviderDescription[];
  coreMessage: string; // The consistent core across descriptions
  divergences: string[];
}

export interface ProviderDescription {
  provider: string;
  description: string;
  alignment: number; // 0-100 alignment with core message
}

export interface CategoryConsistency {
  score: number;
  assignedCategories: Map<string, string[]>; // provider → categories
  consensusCategory: string;
  outliers: string[];
}

// ─── Name Variation Detection ───

/**
 * Detect naming variations from the knowledge graph.
 * Uses alias edges created during citation ingestion.
 */
async function detectNamingVariations(
  brandName: string
): Promise<BrandNameAnalysis> {
  const graph = getKnowledgeGraph();

  // Get all variants from the knowledge graph
  const variants = await graph.getEntityVariants(brandName);

  // If no variants, return perfect score
  if (variants.length === 0) {
    return {
      canonical: brandName,
      variations: [],
      consistencyScore: 100,
      recommendation: null,
    };
  }

  // Calculate consistency score based on variation count and frequency distribution
  const totalMentions = variants.reduce((sum, v) => sum + v.frequency, 0);
  const dominantVariant = variants.reduce((max, v) =>
    v.frequency > max.frequency ? v : max
  );
  const dominantRatio = dominantVariant.frequency / totalMentions;

  // More variations = lower consistency
  // Higher dominance of one variant = higher consistency
  const variationPenalty = Math.min(variants.length * 5, 30);
  const dominanceBonus = dominantRatio * 30;
  const consistencyScore = Math.round(70 - variationPenalty + dominanceBonus);

  const variations: VariationInstance[] = variants.map((v) => ({
    variation: v.variant,
    provider: v.provider,
    frequency: v.frequency,
    context: `Used ${v.frequency} time(s) by ${v.provider}`,
  }));

  // Generate recommendation if consistency is low
  let recommendation: string | null = null;
  if (consistencyScore < 70) {
    recommendation = `Standardize brand name to "${dominantVariant.variant}" across all content. Found ${variants.length} variations.`;
  }

  return {
    canonical: dominantVariant.variant,
    variations,
    consistencyScore: Math.max(0, Math.min(100, consistencyScore)),
    recommendation,
  };
}

// ─── Description Consistency Analysis ───

/**
 * Analyze how different AI providers describe the brand.
 * Uses probe response text stored in the database.
 */
async function analyzeDescriptionConsistency(
  brandName: string,
  probeResponses: Array<{ provider: string; response: string }>
): Promise<DescriptionConsistency> {
  if (probeResponses.length === 0) {
    return {
      score: 100,
      descriptions: [],
      coreMessage: "",
      divergences: [],
    };
  }

  // Use LLM to extract and compare descriptions
  const systemPrompt = `You analyze how different AI systems describe a brand to identify consistency and divergences.`;

  const responseSummaries = probeResponses
    .slice(0, 5) // Limit to 5 for token efficiency
    .map((r) => `${r.provider}:\n${r.response.slice(0, 1000)}`)
    .join("\n\n---\n\n");

  const userPrompt = `Analyze how these AI systems describe "${brandName}":

${responseSummaries}

Return JSON:
{
  "coreMessage": "The consistent core value proposition across all descriptions (1 sentence)",
  "descriptions": [
    {"provider": "openai", "description": "Their 1-sentence description of ${brandName}", "alignment": 0-100},
    ...
  ],
  "divergences": ["List of things one provider says that others don't or contradict"],
  "score": 0-100 overall consistency score
}

Return ONLY the JSON object.`;

  const response = await queryLLM({
    provider: "openai",
    model: "gpt-4o-mini",
    systemPrompt,
    prompt: userPrompt,
    maxTokens: 1000,
  });

  try {
    const result = JSON.parse(response.text);
    return {
      score: result.score || 70,
      descriptions: result.descriptions || [],
      coreMessage: result.coreMessage || "",
      divergences: result.divergences || [],
    };
  } catch {
    return {
      score: 50,
      descriptions: [],
      coreMessage: "Analysis failed",
      divergences: ["Unable to analyze descriptions"],
    };
  }
}

// ─── Category Consistency Analysis ───

/**
 * Check if AI providers categorize the brand consistently.
 */
async function analyzeCategoryConsistency(
  brandName: string,
  probeResponses: Array<{ provider: string; response: string }>
): Promise<CategoryConsistency> {
  if (probeResponses.length === 0) {
    return {
      score: 100,
      assignedCategories: new Map(),
      consensusCategory: "",
      outliers: [],
    };
  }

  const systemPrompt = `You extract how AI systems categorize a brand/product.`;

  const responseSummaries = probeResponses
    .slice(0, 5)
    .map((r) => `${r.provider}: ${r.response.slice(0, 800)}`)
    .join("\n\n");

  const userPrompt = `What category/type does each AI assign to "${brandName}"?

${responseSummaries}

Return JSON:
{
  "categories": {
    "openai": ["category1", "category2"],
    "anthropic": ["category1"],
    ...
  },
  "consensusCategory": "The most common category",
  "outliers": ["Categories only mentioned by one provider"],
  "score": 0-100 consistency score
}

Return ONLY the JSON object.`;

  const response = await queryLLM({
    provider: "openai",
    model: "gpt-4o-mini",
    systemPrompt,
    prompt: userPrompt,
    maxTokens: 600,
  });

  try {
    const result = JSON.parse(response.text);
    const assignedCategories = new Map<string, string[]>();
    for (const [provider, cats] of Object.entries(result.categories || {})) {
      assignedCategories.set(provider, cats as string[]);
    }
    return {
      score: result.score || 70,
      assignedCategories,
      consensusCategory: result.consensusCategory || "",
      outliers: result.outliers || [],
    };
  } catch {
    return {
      score: 50,
      assignedCategories: new Map(),
      consensusCategory: "",
      outliers: ["Analysis failed"],
    };
  }
}

// ─── Recommendation Generator ───

function generateConsistencyRecommendations(
  brandName: BrandNameAnalysis,
  descriptions: DescriptionConsistency,
  categories: CategoryConsistency
): string[] {
  const recommendations: string[] = [];

  // Brand name recommendations
  if (brandName.recommendation) {
    recommendations.push(brandName.recommendation);
  }
  if (brandName.variations.length > 3) {
    recommendations.push(
      `HIGH PRIORITY: ${brandName.variations.length} naming variants detected. AI engines may treat these as different entities.`
    );
  }

  // Description recommendations
  if (descriptions.score < 70) {
    recommendations.push(
      `Align messaging across channels. Core message: "${descriptions.coreMessage}"`
    );
  }
  for (const div of descriptions.divergences.slice(0, 2)) {
    recommendations.push(`Address divergence: ${div}`);
  }

  // Category recommendations
  if (categories.score < 80) {
    recommendations.push(
      `Standardize category positioning to "${categories.consensusCategory}" across all content`
    );
  }
  if (categories.outliers.length > 0) {
    recommendations.push(
      `Remove category confusion: ${categories.outliers.join(", ")} only mentioned by one AI`
    );
  }

  // Schema.org recommendations
  if (brandName.consistencyScore < 80 || categories.score < 80) {
    recommendations.push(
      "Implement consistent Schema.org Organization markup with sameAs links to authoritative profiles"
    );
  }

  return recommendations.slice(0, 8);
}

// ─── Main Checker Function ───

/**
 * Run a full entity consistency check for a brand.
 *
 * @param brandName - The brand to analyze
 * @param probeResponses - Recent probe responses containing brand mentions
 * @param productNames - Optional list of product names to also analyze
 */
export async function checkEntityConsistency(
  brandName: string,
  probeResponses: Array<{ provider: string; response: string }> = [],
  productNames: string[] = []
): Promise<EntityConsistencyReport> {
  // Run analyses in parallel
  const [brandAnalysis, descriptionAnalysis, categoryAnalysis] = await Promise.all([
    detectNamingVariations(brandName),
    analyzeDescriptionConsistency(brandName, probeResponses),
    analyzeCategoryConsistency(brandName, probeResponses),
  ]);

  // Analyze product names if provided
  const productAnalyses: ProductNameAnalysis[] = [];
  for (const productName of productNames.slice(0, 5)) {
    const analysis = await detectNamingVariations(productName);
    productAnalyses.push({
      canonical: analysis.canonical,
      variations: analysis.variations,
      consistencyScore: analysis.consistencyScore,
    });
  }

  // Generate recommendations
  const recommendations = generateConsistencyRecommendations(
    brandAnalysis,
    descriptionAnalysis,
    categoryAnalysis
  );

  // Calculate overall score (weighted average)
  const overallScore = Math.round(
    brandAnalysis.consistencyScore * 0.4 +
    descriptionAnalysis.score * 0.35 +
    categoryAnalysis.score * 0.25
  );

  return {
    overallScore: Math.max(0, Math.min(100, overallScore)),
    brandName: brandAnalysis,
    productNames: productAnalyses,
    descriptions: descriptionAnalysis,
    categories: categoryAnalysis,
    recommendations,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Quick consistency score without detailed analysis.
 * Uses only knowledge graph data (no LLM calls).
 */
export async function quickConsistencyScore(brandName: string): Promise<{
  score: number;
  variationCount: number;
  topVariation: string;
}> {
  const graph = getKnowledgeGraph();
  const variants = await graph.getEntityVariants(brandName);

  if (variants.length === 0) {
    return { score: 100, variationCount: 0, topVariation: brandName };
  }

  const totalMentions = variants.reduce((sum, v) => sum + v.frequency, 0);
  const topVariant = variants.reduce((max, v) =>
    v.frequency > max.frequency ? v : max
  );
  const dominanceRatio = topVariant.frequency / totalMentions;

  // Score: fewer variations + higher dominance = better
  const score = Math.round(100 - variants.length * 8 + dominanceRatio * 20);

  return {
    score: Math.max(0, Math.min(100, score)),
    variationCount: variants.length,
    topVariation: topVariant.variant,
  };
}

/**
 * Get entity resolution recommendations for improving AI citation likelihood.
 */
export function getEntityResolutionTips(): string[] {
  return [
    "Use identical brand name spelling across website, social profiles, and schema markup",
    "Implement Organization schema with 'sameAs' links to LinkedIn, Crunchbase, Wikipedia (if available)",
    "Ensure product names are consistent: avoid 'Product Pro', 'Product Professional', 'Product (Pro)' variations",
    "Use the same product category language your customers use when searching",
    "Include a 'Source of Truth' page (like /about or /company) that AI crawlers can reference",
    "Keep pricing and feature claims consistent across all pages — AI engines cross-reference",
    "If you have a Wikipedia page, ensure it matches your current brand positioning",
    "Add FAQ schema with your official answers to common questions about your brand",
  ];
}
