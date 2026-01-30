import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const [
      totalProbes,
      totalRuns,
      totalResults,
      citedResults,
      sentimentCounts,
      providerStats,
      costSum,
      recentAlerts,
    ] = await Promise.all([
      // Total probes
      prisma.probe.count(),

      // Total runs
      prisma.citationRun.count(),

      // Total results
      prisma.citationResult.count(),

      // Cited results
      prisma.citationResult.count({
        where: { cited: true },
      }),

      // Sentiment breakdown
      prisma.citationResult.groupBy({
        by: ["sentiment"],
        _count: { sentiment: true },
      }),

      // Per-provider citation stats
      prisma.citationResult.groupBy({
        by: ["provider"],
        _count: { id: true },
        where: {},
      }),

      // Total cost
      prisma.citationResult.aggregate({
        _sum: { cost: true },
      }),

      // Recent alerts
      prisma.alert.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    // Calculate citation rate
    const citationRate =
      totalResults > 0 ? (citedResults / totalResults) * 100 : 0;

    // Build sentiment breakdown
    const avgSentiment = {
      positive: 0,
      neutral: 0,
      negative: 0,
    };
    for (const s of sentimentCounts) {
      const key = s.sentiment as keyof typeof avgSentiment;
      if (key in avgSentiment) {
        avgSentiment[key] = s._count.sentiment;
      }
    }

    // Build per-provider citation rates
    const citedByProvider = await prisma.citationResult.groupBy({
      by: ["provider"],
      where: { cited: true },
      _count: { id: true },
    });

    const citedMap = new Map(
      citedByProvider.map((p) => [p.provider, p._count.id])
    );

    const topProviders = providerStats.map((p) => ({
      provider: p.provider,
      total: p._count.id,
      cited: citedMap.get(p.provider) ?? 0,
      citationRate:
        p._count.id > 0
          ? ((citedMap.get(p.provider) ?? 0) / p._count.id) * 100
          : 0,
    }));

    return NextResponse.json({
      totalProbes,
      totalRuns,
      citationRate: Math.round(citationRate * 100) / 100,
      avgSentiment,
      topProviders,
      totalCost: costSum._sum.cost ?? 0,
      recentAlerts,
    });
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
