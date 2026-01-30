"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Activity, BarChart3, DollarSign, Search } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardStats {
  totalProbes: number;
  citationRuns: number;
  citationRate: number;
  totalCost: number;
}

interface TrendPoint {
  date: string;
  openai: number;
  anthropic: number;
  google: number;
  perplexity: number;
}

interface ShareOfVoice {
  name: string;
  value: number;
}

interface ProviderHeatmapEntry {
  provider: string;
  rate: number;
}

interface DashboardTrends {
  citationTrend: TrendPoint[];
  shareOfVoice: ShareOfVoice[];
  providerHeatmap: ProviderHeatmapEntry[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROVIDER_COLORS: Record<string, string> = {
  openai: "#22c55e",
  anthropic: "#f97316",
  google: "#3b82f6",
  perplexity: "#a855f7",
};

const PIE_COLORS = ["#22c55e", "#ef4444"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function heatColor(rate: number): string {
  if (rate >= 70) return "bg-green-100 text-green-800";
  if (rate >= 40) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trends, setTrends] = useState<DashboardTrends | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, trendsRes] = await Promise.all([
          fetch("/api/dashboard/stats"),
          fetch("/api/dashboard/trends"),
        ]);

        if (!statsRes.ok) throw new Error("Failed to fetch dashboard stats");
        if (!trendsRes.ok) throw new Error("Failed to fetch dashboard trends");

        const statsData: DashboardStats = await statsRes.json();
        const trendsData: DashboardTrends = await trendsRes.json();

        setStats(statsData);
        setTrends(trendsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Probes",
      value: stats?.totalProbes ?? 0,
      icon: Search,
    },
    {
      title: "Citation Runs",
      value: stats?.citationRuns ?? 0,
      icon: Activity,
    },
    {
      title: "Citation Rate",
      value: `${(stats?.citationRate ?? 0).toFixed(1)}%`,
      icon: BarChart3,
    },
    {
      title: "Total Cost",
      value: `$${(stats?.totalCost ?? 0).toFixed(2)}`,
      icon: DollarSign,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Citation tracking overview</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold">{card.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Citation trend */}
        <Card>
          <CardHeader>
            <CardTitle>Citation Trend</CardTitle>
            <CardDescription>Citation rate over time by provider</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : trends?.citationTrend && trends.citationTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trends.citationTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="openai"
                    name="OpenAI"
                    stroke={PROVIDER_COLORS.openai}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="anthropic"
                    name="Anthropic"
                    stroke={PROVIDER_COLORS.anthropic}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="google"
                    name="Google"
                    stroke={PROVIDER_COLORS.google}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="perplexity"
                    name="Perplexity"
                    stroke={PROVIDER_COLORS.perplexity}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-sm text-gray-400">
                No trend data available yet. Run some probes to get started.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Share of voice pie */}
        <Card>
          <CardHeader>
            <CardTitle>Share of Voice</CardTitle>
            <CardDescription>Cited vs not-cited breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : trends?.shareOfVoice && trends.shareOfVoice.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={trends.shareOfVoice}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {trends.shareOfVoice.map((_, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={PIE_COLORS[idx % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-sm text-gray-400">
                No citation data available yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Provider heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Provider Heatmap</CardTitle>
          <CardDescription>Citation rate by AI provider</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-20 w-full" />
          ) : trends?.providerHeatmap && trends.providerHeatmap.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {trends.providerHeatmap.map((entry) => (
                <div
                  key={entry.provider}
                  className={`rounded-lg p-4 text-center ${heatColor(entry.rate)}`}
                >
                  <p className="text-sm font-medium">{entry.provider}</p>
                  <p className="text-2xl font-bold">{entry.rate.toFixed(1)}%</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-gray-400">
              No provider data available yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
