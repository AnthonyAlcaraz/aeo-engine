"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Play, ExternalLink } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Brand {
  id: string;
  name: string;
}

interface Probe {
  id: string;
  query: string;
  category: string;
  brandId: string;
  brandName: string;
  active: boolean;
  lastRun: string | null;
}

const CATEGORIES = [
  "best-of",
  "top-list",
  "comparison",
  "how-to",
  "recommendation",
  "alternative",
] as const;

const categoryColors: Record<string, string> = {
  "best-of": "bg-blue-100 text-blue-800",
  "top-list": "bg-purple-100 text-purple-800",
  comparison: "bg-orange-100 text-orange-800",
  "how-to": "bg-green-100 text-green-800",
  recommendation: "bg-pink-100 text-pink-800",
  alternative: "bg-yellow-100 text-yellow-800",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProbesPage() {
  const [probes, setProbes] = useState<Probe[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterBrand, setFilterBrand] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runningProbeId, setRunningProbeId] = useState<string | null>(null);

  // Form state
  const [formBrand, setFormBrand] = useState("");
  const [formQuery, setFormQuery] = useState("");
  const [formCategory, setFormCategory] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [probesRes, brandsRes] = await Promise.all([
        fetch("/api/probes"),
        fetch("/api/brand"),
      ]);
      if (!probesRes.ok) throw new Error("Failed to fetch probes");
      if (!brandsRes.ok) throw new Error("Failed to fetch brands");

      const probesData: Probe[] = await probesRes.json();
      const brandsData: Brand[] = await brandsRes.json();

      setProbes(probesData);
      setBrands(brandsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/probes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId: formBrand,
          query: formQuery,
          category: formCategory,
        }),
      });
      if (!res.ok) throw new Error("Failed to create probe");
      setShowForm(false);
      setFormBrand("");
      setFormQuery("");
      setFormCategory("");
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  async function runProbe(probeId: string) {
    setRunningProbeId(probeId);
    try {
      const res = await fetch("/api/citations/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ probeId }),
      });
      if (!res.ok) throw new Error("Failed to run probe");
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRunningProbeId(null);
    }
  }

  async function toggleActive(probe: Probe) {
    try {
      const res = await fetch(`/api/probes/${probe.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !probe.active }),
      });
      if (!res.ok) throw new Error("Failed to update probe");
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  const filtered =
    filterBrand === "all"
      ? probes
      : probes.filter((p) => p.brandId === filterBrand);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Probes</h1>
          <p className="text-sm text-gray-500">
            Manage and run citation probes
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Probe
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* New probe form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Probe</CardTitle>
            <CardDescription>Create a new citation probe</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Brand</Label>
                  <Select value={formBrand} onValueChange={setFormBrand}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Query</Label>
                  <Input
                    value={formQuery}
                    onChange={(e) => setFormQuery(e.target.value)}
                    placeholder="What are the best CRM tools?"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Creating..." : "Create Probe"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Label className="text-sm text-gray-500">Filter by brand:</Label>
        <Select value={filterBrand} onValueChange={setFilterBrand}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">
              No probes found. Create one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Query
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Brand
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Last Run
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((probe) => (
                <tr key={probe.id} className="hover:bg-gray-50">
                  <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-900">
                    {probe.query}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        categoryColors[probe.category] ??
                        "bg-gray-100 text-gray-800"
                      }
                    >
                      {probe.category}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {probe.brandName}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(probe)}
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        probe.active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {probe.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {probe.lastRun
                      ? new Date(probe.lastRun).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td className="flex items-center gap-1 px-4 py-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => runProbe(probe.id)}
                      disabled={runningProbeId === probe.id}
                    >
                      <Play className="mr-1 h-3 w-3" />
                      {runningProbeId === probe.id ? "Running..." : "Run"}
                    </Button>
                    <Link href={`/probes/${probe.id}/results`}>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
