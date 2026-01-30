import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const probe = await prisma.probe.findUnique({
      where: { id },
      include: {
        brand: true,
        citationRuns: {
          orderBy: { startedAt: "desc" },
          take: 10,
          include: {
            results: true,
          },
        },
      },
    });

    if (!probe) {
      return NextResponse.json({ error: "Probe not found" }, { status: 404 });
    }

    return NextResponse.json(probe);
  } catch (error) {
    console.error("Failed to fetch probe:", error);
    return NextResponse.json(
      { error: "Failed to fetch probe" },
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

const updateProbeSchema = z.object({
  query: z.string().min(1).optional(),
  category: z.enum(VALID_CATEGORIES).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateProbeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.probe.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Probe not found" }, { status: 404 });
    }

    const probe = await prisma.probe.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(probe);
  } catch (error) {
    console.error("Failed to update probe:", error);
    return NextResponse.json(
      { error: "Failed to update probe" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.probe.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Probe not found" }, { status: 404 });
    }

    await prisma.probe.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete probe:", error);
    return NextResponse.json(
      { error: "Failed to delete probe" },
      { status: 500 }
    );
  }
}
