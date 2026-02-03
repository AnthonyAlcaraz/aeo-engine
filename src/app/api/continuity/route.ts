/**
 * Landing Page Continuity API
 *
 * POST /api/continuity
 * Scores how well a landing page "continues the answer" from an AI citation.
 *
 * POST /api/continuity/quick
 * Quick score without detailed analysis.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  scoreFunnelContinuity,
  quickContinuityScore,
} from "@/lib/scoring/continuity";

// ─── Validation Schemas ───

const fullAnalysisSchema = z.object({
  aiResponse: z.string().min(50, "AI response must be at least 50 characters"),
  landingPageContent: z.string().min(100, "Landing page content must be at least 100 characters"),
  originalQuery: z.string().min(5, "Original query must be at least 5 characters"),
  brandName: z.string().min(1, "Brand name is required"),
});

const quickScoreSchema = z.object({
  aiResponse: z.string().min(50),
  landingPageContent: z.string().min(100),
  brandName: z.string().min(1),
});

// ─── POST Handler ───

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = new URL(request.url);
    const isQuick = url.pathname.endsWith("/quick");

    if (isQuick) {
      // Quick score endpoint
      const validated = quickScoreSchema.parse(body);
      const score = await quickContinuityScore(
        validated.aiResponse,
        validated.landingPageContent,
        validated.brandName
      );
      return NextResponse.json({ score });
    }

    // Full analysis endpoint
    const validated = fullAnalysisSchema.parse(body);
    const result = await scoreFunnelContinuity(
      validated.aiResponse,
      validated.landingPageContent,
      validated.originalQuery,
      validated.brandName
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Continuity scoring error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
