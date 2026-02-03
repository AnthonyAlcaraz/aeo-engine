/**
 * Landing Page Continuity Scorer
 *
 * Based on the "Be The Answer" principle: when AI cites your brand,
 * the user's landing page must "continue the same answer" the AI started.
 *
 * This module scores how well a landing page aligns with the AI response
 * that drove the visitor there. Misalignment = high bounce rate.
 *
 * Three scoring dimensions:
 * 1. Claim Alignment: Does the landing page support the claims made by the AI?
 * 2. Message Continuity: Does the page reinforce the same value proposition?
 * 3. Intent Match: Does the CTA align with the user's original question?
 */

import { queryLLM } from "@/lib/llm";

// ─── Types ───

export interface ContinuityCheck {
  overallScore: number; // 0-100
  claimAlignment: ClaimAlignmentResult;
  messageContinuity: MessageContinuityResult;
  intentMatch: IntentMatchResult;
  recommendations: string[];
}

export interface ClaimAlignmentResult {
  score: number; // 0-100
  claimsFromAI: string[];
  claimsSupported: string[];
  claimsMissing: string[];
  claimsContradicted: string[];
}

export interface MessageContinuityResult {
  score: number; // 0-100
  aiValueProp: string;
  pageValueProp: string;
  alignmentIssues: string[];
}

export interface IntentMatchResult {
  score: number; // 0-100
  originalIntent: string;
  pageServes: string;
  ctaAlignment: "strong" | "weak" | "misaligned";
  suggestedCTA: string;
}

// ─── Claim Extraction ───

/**
 * Extract factual claims about a brand from an AI response.
 * These are the promises the AI made that the landing page must fulfill.
 */
async function extractClaimsFromAIResponse(
  aiResponse: string,
  brandName: string
): Promise<string[]> {
  const systemPrompt = `You are analyzing an AI-generated response for factual claims about a specific brand. Extract only concrete, verifiable claims.`;

  const userPrompt = `Extract all factual claims about "${brandName}" from this AI response. Return only claims that:
1. Are about ${brandName} specifically (not general industry claims)
2. Are concrete and verifiable (features, capabilities, pricing, comparisons)
3. Would influence a buying decision

AI Response:
---
${aiResponse}
---

Return a JSON array of claim strings. Example:
["offers a free tier", "integrates with Slack", "rated #1 for small businesses"]

Return ONLY the JSON array, no explanation.`;

  const response = await queryLLM({
    provider: "openai",
    model: "gpt-4o-mini",
    systemPrompt,
    prompt: userPrompt,
    maxTokens: 1000,
  });

  try {
    return JSON.parse(response.text);
  } catch {
    // Fallback: extract lines that look like claims
    return response.text
      .split("\n")
      .filter((line) => line.trim().length > 10)
      .slice(0, 10);
  }
}

/**
 * Check which claims are supported, missing, or contradicted by the landing page.
 */
async function validateClaimsAgainstPage(
  claims: string[],
  landingPageContent: string,
  brandName: string
): Promise<{
  supported: string[];
  missing: string[];
  contradicted: string[];
}> {
  const systemPrompt = `You are validating whether a landing page supports, ignores, or contradicts specific claims about a brand.`;

  const userPrompt = `Analyze whether this landing page supports each claim about "${brandName}".

Claims to validate:
${claims.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Landing Page Content:
---
${landingPageContent.slice(0, 8000)}
---

For each claim, determine:
- "supported": The page explicitly or implicitly confirms this claim
- "missing": The page doesn't address this claim at all
- "contradicted": The page contradicts or undermines this claim

Return JSON with three arrays:
{
  "supported": [1, 3, 5],
  "missing": [2, 4],
  "contradicted": [6]
}

Use the claim numbers from the list above. Return ONLY the JSON object.`;

  const response = await queryLLM({
    provider: "openai",
    model: "gpt-4o-mini",
    systemPrompt,
    prompt: userPrompt,
    maxTokens: 500,
  });

  try {
    const result = JSON.parse(response.text);
    return {
      supported: (result.supported || []).map((i: number) => claims[i - 1]).filter(Boolean),
      missing: (result.missing || []).map((i: number) => claims[i - 1]).filter(Boolean),
      contradicted: (result.contradicted || []).map((i: number) => claims[i - 1]).filter(Boolean),
    };
  } catch {
    return { supported: [], missing: claims, contradicted: [] };
  }
}

// ─── Message Continuity ───

/**
 * Extract the core value proposition from AI response and landing page,
 * then compare for alignment.
 */
async function analyzeMessageContinuity(
  aiResponse: string,
  landingPageContent: string,
  brandName: string
): Promise<MessageContinuityResult> {
  const systemPrompt = `You analyze value proposition alignment between an AI recommendation and a landing page.`;

  const userPrompt = `Compare the value proposition communicated about "${brandName}" in an AI response vs the landing page.

AI Response:
---
${aiResponse}
---

Landing Page:
---
${landingPageContent.slice(0, 6000)}
---

Analyze:
1. What value proposition does the AI communicate about ${brandName}?
2. What value proposition does the landing page communicate?
3. Are they aligned? List any disconnects.

Return JSON:
{
  "aiValueProp": "one sentence summary of what the AI says ${brandName} is for",
  "pageValueProp": "one sentence summary of what the landing page says ${brandName} is for",
  "score": 0-100 (100 = perfect alignment),
  "issues": ["list", "of", "alignment", "issues"]
}

Return ONLY the JSON object.`;

  const response = await queryLLM({
    provider: "openai",
    model: "gpt-4o-mini",
    systemPrompt,
    prompt: userPrompt,
    maxTokens: 800,
  });

  try {
    const result = JSON.parse(response.text);
    return {
      score: result.score || 50,
      aiValueProp: result.aiValueProp || "Unable to extract",
      pageValueProp: result.pageValueProp || "Unable to extract",
      alignmentIssues: result.issues || [],
    };
  } catch {
    return {
      score: 50,
      aiValueProp: "Analysis failed",
      pageValueProp: "Analysis failed",
      alignmentIssues: ["Unable to analyze message continuity"],
    };
  }
}

// ─── Intent Match ───

/**
 * Analyze whether the landing page serves the user's original intent
 * (the question they asked the AI).
 */
async function analyzeIntentMatch(
  originalQuery: string,
  landingPageContent: string,
  brandName: string
): Promise<IntentMatchResult> {
  const systemPrompt = `You analyze whether a landing page serves the intent behind a user's original question.`;

  const userPrompt = `A user asked an AI: "${originalQuery}"

The AI recommended "${brandName}" and the user clicked through to this landing page:
---
${landingPageContent.slice(0, 6000)}
---

Analyze:
1. What was the user's original intent/need?
2. What does this landing page primarily serve?
3. How well does the CTA align with the user's intent?
4. What CTA would better serve this user?

Return JSON:
{
  "originalIntent": "what the user was trying to accomplish",
  "pageServes": "what the landing page is designed to do",
  "ctaAlignment": "strong" | "weak" | "misaligned",
  "suggestedCTA": "a CTA that would better serve this user's intent",
  "score": 0-100 (100 = perfect intent match)
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
    return {
      score: result.score || 50,
      originalIntent: result.originalIntent || "Unable to determine",
      pageServes: result.pageServes || "Unable to determine",
      ctaAlignment: result.ctaAlignment || "weak",
      suggestedCTA: result.suggestedCTA || "Schedule a demo",
    };
  } catch {
    return {
      score: 50,
      originalIntent: "Analysis failed",
      pageServes: "Analysis failed",
      ctaAlignment: "weak",
      suggestedCTA: "Learn more",
    };
  }
}

// ─── Recommendation Generator ───

function generateRecommendations(
  claimAlignment: ClaimAlignmentResult,
  messageContinuity: MessageContinuityResult,
  intentMatch: IntentMatchResult
): string[] {
  const recommendations: string[] = [];

  // Claim alignment recommendations
  if (claimAlignment.claimsMissing.length > 0) {
    recommendations.push(
      `Add content supporting: ${claimAlignment.claimsMissing.slice(0, 3).join(", ")}`
    );
  }
  if (claimAlignment.claimsContradicted.length > 0) {
    recommendations.push(
      `CRITICAL: Page contradicts AI claims: ${claimAlignment.claimsContradicted.join(", ")}`
    );
  }

  // Message continuity recommendations
  if (messageContinuity.score < 70) {
    recommendations.push(
      `Align page messaging with AI positioning: "${messageContinuity.aiValueProp}"`
    );
  }
  for (const issue of messageContinuity.alignmentIssues.slice(0, 2)) {
    recommendations.push(`Fix messaging: ${issue}`);
  }

  // Intent match recommendations
  if (intentMatch.ctaAlignment === "misaligned") {
    recommendations.push(
      `Change CTA to: "${intentMatch.suggestedCTA}" (currently misaligned with user intent)`
    );
  } else if (intentMatch.ctaAlignment === "weak") {
    recommendations.push(
      `Strengthen CTA: Consider "${intentMatch.suggestedCTA}"`
    );
  }

  if (intentMatch.score < 60) {
    recommendations.push(
      `Create dedicated landing page for intent: "${intentMatch.originalIntent}"`
    );
  }

  return recommendations.slice(0, 7); // Max 7 recommendations
}

// ─── Main Scoring Function ───

/**
 * Score how well a landing page continues the answer an AI provided.
 *
 * @param aiResponse - The AI response that cited the brand
 * @param landingPageContent - The landing page content (markdown or HTML)
 * @param originalQuery - The user's original question to the AI
 * @param brandName - The brand being evaluated
 */
export async function scoreFunnelContinuity(
  aiResponse: string,
  landingPageContent: string,
  originalQuery: string,
  brandName: string
): Promise<ContinuityCheck> {
  // Run all three analyses in parallel
  const [claims, messageContinuity, intentMatch] = await Promise.all([
    extractClaimsFromAIResponse(aiResponse, brandName),
    analyzeMessageContinuity(aiResponse, landingPageContent, brandName),
    analyzeIntentMatch(originalQuery, landingPageContent, brandName),
  ]);

  // Validate claims against page (depends on claim extraction)
  const claimValidation = await validateClaimsAgainstPage(
    claims,
    landingPageContent,
    brandName
  );

  // Calculate claim alignment score
  const totalClaims = claims.length || 1;
  const claimScore = Math.round(
    ((claimValidation.supported.length * 100) / totalClaims) -
    ((claimValidation.contradicted.length * 30) / totalClaims)
  );

  const claimAlignment: ClaimAlignmentResult = {
    score: Math.max(0, Math.min(100, claimScore)),
    claimsFromAI: claims,
    claimsSupported: claimValidation.supported,
    claimsMissing: claimValidation.missing,
    claimsContradicted: claimValidation.contradicted,
  };

  // Generate recommendations
  const recommendations = generateRecommendations(
    claimAlignment,
    messageContinuity,
    intentMatch
  );

  // Calculate overall score (weighted average)
  const overallScore = Math.round(
    claimAlignment.score * 0.4 +
    messageContinuity.score * 0.35 +
    intentMatch.score * 0.25
  );

  return {
    overallScore: Math.max(0, Math.min(100, overallScore)),
    claimAlignment,
    messageContinuity,
    intentMatch,
    recommendations,
  };
}

/**
 * Quick continuity check with just the essentials.
 * Use when you only need a score, not detailed analysis.
 */
export async function quickContinuityScore(
  aiResponse: string,
  landingPageContent: string,
  brandName: string
): Promise<number> {
  const systemPrompt = `You quickly assess landing page alignment with AI recommendations.`;

  const userPrompt = `Rate 0-100 how well this landing page "continues the answer" from the AI response about ${brandName}.

100 = Perfect: The page reinforces exactly what the AI said, user feels validated
70 = Good: Page mostly aligns, minor gaps
50 = Okay: Some alignment but noticeable disconnects
30 = Poor: Page talks about different things than what AI promised
0 = Terrible: Page contradicts the AI response

AI Response:
---
${aiResponse.slice(0, 2000)}
---

Landing Page:
---
${landingPageContent.slice(0, 3000)}
---

Return ONLY a number 0-100.`;

  const response = await queryLLM({
    provider: "openai",
    model: "gpt-4o-mini",
    systemPrompt,
    prompt: userPrompt,
    maxTokens: 10,
  });

  const score = parseInt(response.text.trim(), 10);
  return isNaN(score) ? 50 : Math.max(0, Math.min(100, score));
}
