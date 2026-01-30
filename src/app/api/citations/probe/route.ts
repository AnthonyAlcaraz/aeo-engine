import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { buildProbePrompt } from "@/lib/citation/prompt-builder";
import type { ProbeCategory } from "@/lib/citation/prompt-builder";
import { getEnabledProviders, queryLLM } from "@/lib/llm";
import type { LLMProvider } from "@/lib/llm";
import { detectCitation } from "@/lib/citation/detector";

const runProbeSchema = z.object({
  probeId: z.string().min(1, "Probe ID is required"),
  providers: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  let runId: string | null = null;

  try {
    const body = await request.json();
    const parsed = runProbeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { probeId, providers: requestedProviders } = parsed.data;

    const probe = await prisma.probe.findUnique({
      where: { id: probeId },
      include: { brand: true },
    });

    if (!probe) {
      return NextResponse.json({ error: "Probe not found" }, { status: 404 });
    }

    const prompt = buildProbePrompt(
      probe.query,
      probe.category as ProbeCategory
    );

    const competitors: Array<{ name: string; domain: string }> = JSON.parse(
      probe.brand.competitors
    );

    const providers = (requestedProviders ?? getEnabledProviders()) as LLMProvider[];

    const run = await prisma.citationRun.create({
      data: {
        probeId,
        brandId: probe.brandId,
        status: "running",
        startedAt: new Date(),
      },
    });
    runId = run.id;

    const results = [];

    for (const provider of providers) {
      try {
        const response = await queryLLM({
          provider,
          prompt,
        });

        const citation = detectCitation(
          response.text,
          probe.brand.name,
          probe.brand.domain,
          competitors
        );

        const result = await prisma.citationResult.create({
          data: {
            runId: run.id,
            provider,
            model: response.model,
            response: response.text,
            cited: citation.cited,
            citationType: citation.citationType,
            sentiment: citation.sentiment,
            position: citation.position,
            competitorsMentioned: JSON.stringify(citation.competitorsMentioned),
            confidence: citation.confidence,
            latencyMs: response.latencyMs,
            tokensUsed: response.tokensIn + response.tokensOut,
            cost: response.cost,
          },
        });

        results.push(result);
      } catch (providerError) {
        console.error(`Provider ${provider} failed:`, providerError);

        const result = await prisma.citationResult.create({
          data: {
            runId: run.id,
            provider,
            model: "unknown",
            response:
              providerError instanceof Error
                ? providerError.message
                : "Unknown error",
            cited: false,
            confidence: 0,
          },
        });

        results.push(result);
      }
    }

    const completedRun = await prisma.citationRun.update({
      where: { id: run.id },
      data: {
        status: "completed",
        endedAt: new Date(),
      },
      include: {
        results: true,
      },
    });

    return NextResponse.json(completedRun, { status: 201 });
  } catch (error) {
    console.error("Failed to run probe:", error);

    if (runId) {
      await prisma.citationRun
        .update({
          where: { id: runId },
          data: {
            status: "failed",
            endedAt: new Date(),
          },
        })
        .catch((updateErr: unknown) =>
          console.error("Failed to update run status:", updateErr)
        );
    }

    return NextResponse.json(
      { error: "Failed to run probe" },
      { status: 500 }
    );
  }
}
