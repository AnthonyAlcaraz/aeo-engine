import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brandId");

    const where = brandId ? { brandId } : {};

    const probes = await prisma.probe.findMany({
      where,
      include: {
        brand: {
          select: { name: true },
        },
        _count: {
          select: { citationRuns: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(probes);
  } catch (error) {
    console.error("Failed to fetch probes:", error);
    return NextResponse.json(
      { error: "Failed to fetch probes" },
      { status: 500 }
    );
  }
}

const VALID_CATEGORIES = [
  "best-of",
  "top-list",
  "comparison",
  "how-to",
  "recommendation",
  "alternative",
] as const;

const createProbeSchema = z.object({
  brandId: z.string().min(1, "Brand ID is required"),
  query: z.string().min(1, "Query is required"),
  category: z.enum(VALID_CATEGORIES),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createProbeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { brandId, query, category } = parsed.data;

    const brand = await prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const probe = await prisma.probe.create({
      data: {
        brandId,
        query,
        category,
      },
    });

    return NextResponse.json(probe, { status: 201 });
  } catch (error) {
    console.error("Failed to create probe:", error);
    return NextResponse.json(
      { error: "Failed to create probe" },
      { status: 500 }
    );
  }
}
