"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Check, X, ChevronDown, ChevronRight } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Probe {
  id: string;
  query: string;
  category: string;
  brandName: string;
}

interface ProviderResult {
  provider: string;
  cited: boolean;
  citationType: string;
  sentiment: string;
  position: number | null;
  confidence: number;
}

interface CitationRun {
  id: string;
  createdAt: string;
  status: string;
  results: ProviderResult[];
}

const providerBadgeColors: Record<string, string> = {
  openai: "bg-green-100 text-green-800",
  anthropic: "bg-orange-100 text-orange-800",
  google: "bg-blue-100 text-blue-800",
  perplexity: "bg-purple-100 text-purple-800",
};

const sentimentColors: Record<string, string> = {
  positive: "bg-green-100 text-green-800",
  neutral: "bg-gray-100 text-gray-800",
  negative: "bg-red-100 text-red-800",
  mixed: "bg-yellow-100 text-yellow-800",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProbeResultsPage() {
  const params = useParams();
  const probeId = params.id as string;

  const [probe, setProbe] = useState<Probe | null>(null);
  const [runs, setRuns] = useState<CitationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchResults();
  }, [probeId]);

  async function fetchResults() {
    try {
      setLoading(true);
      const res = await fetch(`/api/probes/${probeId}`);
      if (!res.ok) throw new Error("Failed to fetch probe results");
      const data = await res.json();
      setProbe(data.probe);
      setRuns(data.runs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function runAgain() {
    setRunning(true);
    try {
      const res = await fetch("/api/citations/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ probeId }),
      });
      if (!res.ok) throw new Error("Failed to run probe");
      await fetchResults();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRunning(false);
    }
  }

  function toggleExpand(runId: string) {
    setExpandedRuns((prev) => {
      const next = new Set(prev);
      if (next.has(runId)) {
        next.delete(runId);
      } else {
        next.add(runId);
      }
      return next;
    });
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Probe Results</h1>
          <p className="text-sm text-gray-500">Citation run history</p>
        </div>
        <Button onClick={runAgain} disabled={running}>
          <Play className="mr-2 h-4 w-4" />
          {running ? "Running..." : "Run Again"}
        </Button>
      </div>

      {/* Probe info */}
      {loading ? (
        <Skeleton className="h-24 w-full rounded-lg" />
      ) : probe ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{probe.query}</CardTitle>
            <CardDescription>
              <Badge variant="secondary" className="mr-2">
                {probe.category}
              </Badge>
              <span className="text-gray-500">Brand: {probe.brandName}</span>
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {/* Runs */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : runs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">
              No citation runs yet. Click &quot;Run Again&quot; to start.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => {
            const isExpanded = expandedRuns.has(run.id);
            return (
              <Card key={run.id}>
                <button
                  onClick={() => toggleExpand(run.id)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left"
                >
                  <div className="flex items-center gap-4">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(run.createdAt).toLocaleString()}
                    </span>
                    <Badge
                      className={
                        run.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : run.status === "failed"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }
                    >
                      {run.status}
                    </Badge>
                  </div>
                  <span className="text-xs text-gray-400">
                    {run.results.length} provider
                    {run.results.length !== 1 ? "s" : ""}
                  </span>
                </button>

                {isExpanded && (
                  <CardContent className="border-t pt-4">
                    {run.results.length === 0 ? (
                      <p className="text-sm text-gray-400">
                        No results for this run.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {run.results.map((result, idx) => (
                          <div
                            key={idx}
                            className="flex flex-wrap items-center gap-3 rounded-md border p-3"
                          >
                            {/* Provider */}
                            <Badge
                              className={
                                providerBadgeColors[
                                  result.provider.toLowerCase()
                                ] ?? "bg-gray-100 text-gray-800"
                              }
                            >
                              {result.provider}
                            </Badge>

                            {/* Cited */}
                            <span className="flex items-center gap-1 text-sm">
                              {result.cited ? (
                                <>
                                  <Check className="h-4 w-4 text-green-600" />
                                  <span className="text-green-700">Cited</span>
                                </>
                              ) : (
                                <>
                                  <X className="h-4 w-4 text-red-500" />
                                  <span className="text-red-600">
                                    Not cited
                                  </span>
                                </>
                              )}
                            </span>

                            {/* Citation type */}
                            {result.citationType && (
                              <span className="text-xs text-gray-500">
                                Type: {result.citationType}
                              </span>
                            )}

                            {/* Sentiment */}
                            <Badge
                              className={
                                sentimentColors[result.sentiment] ??
                                "bg-gray-100 text-gray-800"
                              }
                            >
                              {result.sentiment}
                            </Badge>

                            {/* Position */}
                            {result.position !== null && (
                              <span className="text-xs text-gray-500">
                                Position: #{result.position}
                              </span>
                            )}

                            {/* Confidence */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                Confidence:
                              </span>
                              <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                                <div
                                  className="h-full rounded-full bg-blue-500"
                                  style={{
                                    width: `${Math.round(result.confidence * 100)}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">
                                {Math.round(result.confidence * 100)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
