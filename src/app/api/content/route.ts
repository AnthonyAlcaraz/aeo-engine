import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brandId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (brandId) where.brandId = brandId;
    if (status) where.status = status;

    const content = await prisma.content.findMany({
      where,
      include: {
        brand: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(content);
  } catch (error) {
    console.error("Failed to fetch content:", error);
    return NextResponse.json(
      { error: "Failed to fetch content" },
      { status: 500 }
    );
  }
}

const createContentSchema = z.object({
  brandId: z.string().min(1, "Brand ID is required"),
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Body is required"),
  contentType: z.string().min(1, "Content type is required"),
  status: z.string().default("draft"),
  targetKeywords: z.array(z.string()).default([]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createContentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { brandId, title, body: contentBody, contentType, status, targetKeywords } = parsed.data;

    const brand = await prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const content = await prisma.content.create({
      data: {
        brandId,
        title,
        body: contentBody,
        contentType,
        status,
        targetKeywords: JSON.stringify(targetKeywords),
      },
    });

    return NextResponse.json(content, { status: 201 });
  } catch (error) {
    console.error("Failed to create content:", error);
    return NextResponse.json(
      { error: "Failed to create content" },
      { status: 500 }
    );
  }
}
