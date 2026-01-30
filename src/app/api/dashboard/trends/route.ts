import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") ?? "30", 10);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Fetch all runs in the date range with their results
    const runs = await prisma.citationRun.findMany({
      where: {
        startedAt: { gte: startDate },
        status: "completed",
      },
      include: {
        results: {
          select: {
            provider: true,
            cited: true,
          },
        },
      },
      orderBy: { startedAt: "asc" },
    });

    // Group by date
    const dailyMap = new Map<
      string,
      {
        date: string;
        runs: number;
        total: number;
        cited: number;
        providers: Record<string, { total: number; cited: number }>;
      }
    >();

    for (const run of runs) {
      const dateKey = run.startedAt.toISOString().split("T")[0];

      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: dateKey,
          runs: 0,
          total: 0,
          cited: 0,
          providers: {},
        });
      }

      const day = dailyMap.get(dateKey)!;
      day.runs += 1;

      for (const result of run.results) {
        day.total += 1;
        if (result.cited) day.cited += 1;

        if (!day.providers[result.provider]) {
          day.providers[result.provider] = { total: 0, cited: 0 };
        }
        day.providers[result.provider].total += 1;
        if (result.cited) day.providers[result.provider].cited += 1;
      }
    }

    // Convert to array with citation rates
    const trends = Array.from(dailyMap.values()).map((day) => {
      const providerRates: Record<string, number> = {};
      for (const [provider, stats] of Object.entries(day.providers)) {
        providerRates[provider] =
          stats.total > 0
            ? Math.round((stats.cited / stats.total) * 10000) / 100
            : 0;
      }

      return {
        date: day.date,
        total: day.total,
        cited: day.cited,
        citationRate:
          day.total > 0
            ? Math.round((day.cited / day.total) * 10000) / 100
            : 0,
        providers: providerRates,
      };
    });

    return NextResponse.json(trends);
  } catch (error) {
    console.error("Failed to fetch trends:", error);
    return NextResponse.json(
      { error: "Failed to fetch trends" },
      { status: 500 }
    );
  }
}
