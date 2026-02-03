/**
 * Entity Consistency API
 *
 * POST /api/entity-consistency
 * Run full entity consistency check for a brand.
 *
 * GET /api/entity-consistency/quick?brand=X
 * Quick consistency score using only knowledge graph data.
 *
 * GET /api/entity-consistency/tips
 * Get entity resolution best practices.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  checkEntityConsistency,
  quickConsistencyScore,
  getEntityResolutionTips,
} from "@/lib/graph/entity-consistency";

// ─── Validation Schemas ───

const fullCheckSchema = z.object({
  brandName: z.string().min(1, "Brand name is required"),
  probeResponses: z
    .array(
      z.object({
        provider: z.string(),
        response: z.string(),
      })
    )
    .optional()
    .default([]),
  productNames: z.array(z.string()).optional().default([]),
});

// ─── GET Handler ───

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  // Tips endpoint
  if (url.pathname.endsWith("/tips")) {
    const tips = getEntityResolutionTips();
    return NextResponse.json({ tips });
  }

  // Quick score endpoint
  if (url.pathname.endsWith("/quick")) {
    const brandName = url.searchParams.get("brand");
    if (!brandName) {
      return NextResponse.json(
        { error: "brand query parameter is required" },
        { status: 400 }
      );
    }

    try {
      const result = await quickConsistencyScore(brandName);
      return NextResponse.json(result);
    } catch (error) {
      console.error("Quick consistency check error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: "Use POST for full analysis or GET /quick?brand=X for quick score" },
    { status: 400 }
  );
}

// ─── POST Handler ───

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = fullCheckSchema.parse(body);

    const result = await checkEntityConsistency(
      validated.brandName,
      validated.probeResponses,
      validated.productNames
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Entity consistency check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
