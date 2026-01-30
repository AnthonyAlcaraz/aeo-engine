import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateContent } from "@/lib/content/generator";
import type { LLMProvider } from "@/lib/llm";

const generateContentSchema = z.object({
  brandId: z.string().min(1, "Brand ID is required"),
  topic: z.string().min(1, "Topic is required"),
  contentType: z.enum(["article", "faq", "how-to", "comparison"]),
  provider: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = generateContentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { brandId, topic, contentType, provider } = parsed.data;

    const brand = await prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const keywords: string[] = JSON.parse(brand.keywords);

    const generated = await generateContent(
      {
        brandName: brand.name,
        brandDomain: brand.domain,
        keywords,
        contentType,
        topic,
      },
      (provider as LLMProvider) ?? "openai"
    );

    const content = await prisma.content.create({
      data: {
        brandId,
        title: generated.title,
        body: generated.body,
        contentType,
        status: "draft",
        targetKeywords: brand.keywords,
        schemaMarkup: generated.schemaMarkup,
        aeoScore: generated.aeoScore,
      },
    });

    return NextResponse.json(content, { status: 201 });
  } catch (error) {
    console.error("Failed to generate content:", error);
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    );
  }
}
