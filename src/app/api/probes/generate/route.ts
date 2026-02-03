/**
 * Validation Probe Generation API
 *
 * POST /api/probes/generate
 * Generate a full set of validation probes for a brand using the
 * "Be The Answer" framework patterns.
 *
 * Returns probes designed to test citation likelihood across different
 * question patterns that AI engines commonly receive.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  generateValidationProbes,
  getProbeCategories,
} from "@/lib/citation/prompt-builder";

// ─── Validation Schemas ───

const generateProbesSchema = z.object({
  brandId: z.string().min(1, "Brand ID is required"),
  category: z.string().min(1, "Category/topic is required"),
  saveToDatabase: z.boolean().optional().default(false),
});

// ─── GET Handler: List available probe categories ───

export async function GET() {
  const categories = getProbeCategories();
  return NextResponse.json({
    categories,
    standard: categories.filter((c) => c.type === "standard"),
    validation: categories.filter((c) => c.type === "validation"),
  });
}

// ─── POST Handler: Generate validation probes ───

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = generateProbesSchema.parse(body);

    // Fetch brand with competitors
    const brand = await prisma.brand.findUnique({
      where: { id: validated.brandId },
      include: {
        competitors: true,
      },
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    // Generate validation probes
    const competitorNames = brand.competitors?.map((c: any) => c.name) || [];
    const probes = generateValidationProbes(
      brand.name,
      validated.category,
      competitorNames
    );

    // Optionally save to database
    if (validated.saveToDatabase) {
      const created = [];
      for (const probe of probes) {
        const existing = await prisma.probe.findFirst({
          where: {
            brandId: brand.id,
            query: probe.prompt,
          },
        });

        if (!existing) {
          const newProbe = await prisma.probe.create({
            data: {
              brandId: brand.id,
              query: probe.prompt,
              category: probe.category,
            },
          });
          created.push(newProbe);
        }
      }

      return NextResponse.json({
        generated: probes.length,
        saved: created.length,
        skipped: probes.length - created.length,
        probes: created,
      });
    }

    return NextResponse.json({
      brandName: brand.name,
      category: validated.category,
      competitors: competitorNames,
      probeCount: probes.length,
      probes,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Probe generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
