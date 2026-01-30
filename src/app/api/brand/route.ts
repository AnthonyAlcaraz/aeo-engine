import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const brands = await prisma.brand.findMany({
      include: {
        _count: {
          select: {
            probes: true,
            citationRuns: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(brands);
  } catch (error) {
    console.error("Failed to fetch brands:", error);
    return NextResponse.json(
      { error: "Failed to fetch brands" },
      { status: 500 }
    );
  }
}

const createBrandSchema = z.object({
  name: z.string().min(1, "Name is required"),
  domain: z.string().url("Domain must be a valid URL"),
  description: z.string().default(""),
  keywords: z.array(z.string()).default([]),
  competitors: z
    .array(
      z.object({
        name: z.string().min(1),
        domain: z.string().url(),
      })
    )
    .default([]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createBrandSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, domain, description, keywords, competitors } = parsed.data;

    const brand = await prisma.brand.create({
      data: {
        name,
        domain,
        description,
        keywords: JSON.stringify(keywords),
        competitors: JSON.stringify(competitors),
      },
    });

    return NextResponse.json(brand, { status: 201 });
  } catch (error) {
    console.error("Failed to create brand:", error);
    return NextResponse.json(
      { error: "Failed to create brand" },
      { status: 500 }
    );
  }
}
