"use client";

import { useState, useEffect, FormEvent } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Competitor {
  name: string;
  domain: string;
}

interface Brand {
  id: string;
  name: string;
  domain: string;
  description: string;
  keywords: string[];
  competitors: Competitor[];
}

interface BrandFormData {
  name: string;
  domain: string;
  description: string;
  keywordsRaw: string;
  competitors: Competitor[];
}

const emptyForm: BrandFormData = {
  name: "",
  domain: "",
  description: "",
  keywordsRaw: "",
  competitors: [],
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BrandPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BrandFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // Fetch brands
  useEffect(() => {
    fetchBrands();
  }, []);

  async function fetchBrands() {
    try {
      setLoading(true);
      const res = await fetch("/api/brand");
      if (!res.ok) throw new Error("Failed to fetch brands");
      const data: Brand[] = await res.json();
      setBrands(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function openNewForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(brand: Brand) {
    setForm({
      name: brand.name,
      domain: brand.domain,
      description: brand.description,
      keywordsRaw: brand.keywords.join(", "),
      competitors: [...brand.competitors],
    });
    setEditingId(brand.id);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function addCompetitor() {
    setForm((prev) => ({
      ...prev,
      competitors: [...prev.competitors, { name: "", domain: "" }],
    }));
  }

  function removeCompetitor(index: number) {
    setForm((prev) => ({
      ...prev,
      competitors: prev.competitors.filter((_, i) => i !== index),
    }));
  }

  function updateCompetitor(index: number, field: keyof Competitor, value: string) {
    setForm((prev) => {
      const updated = [...prev.competitors];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, competitors: updated };
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      name: form.name,
      domain: form.domain,
      description: form.description,
      keywords: form.keywordsRaw
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
      competitors: form.competitors.filter((c) => c.name || c.domain),
    };

    try {
      const url = editingId ? `/api/brand/${editingId}` : "/api/brand";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save brand");

      closeForm();
      await fetchBrands();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteBrand(id: string) {
    if (!confirm("Delete this brand?")) return;
    try {
      const res = await fetch(`/api/brand/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete brand");
      await fetchBrands();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brand Kit</h1>
          <p className="text-sm text-gray-500">
            Manage your brands and competitors
          </p>
        </div>
        <Button onClick={openNewForm}>
          <Plus className="mr-2 h-4 w-4" />
          Add Brand
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit Brand" : "New Brand"}</CardTitle>
            <CardDescription>
              {editingId
                ? "Update brand information"
                : "Add a new brand to track"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="Acme Inc."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Domain</Label>
                  <Input
                    id="domain"
                    value={form.domain}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, domain: e.target.value }))
                    }
                    placeholder="acme.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Brief description of the brand..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                <Input
                  id="keywords"
                  value={form.keywordsRaw}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, keywordsRaw: e.target.value }))
                  }
                  placeholder="crm, sales automation, lead generation"
                />
              </div>

              {/* Competitors */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Competitors</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCompetitor}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add Competitor
                  </Button>
                </div>
                {form.competitors.map((comp, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={comp.name}
                      onChange={(e) =>
                        updateCompetitor(idx, "name", e.target.value)
                      }
                      placeholder="Competitor name"
                      className="flex-1"
                    />
                    <Input
                      value={comp.domain}
                      onChange={(e) =>
                        updateCompetitor(idx, "domain", e.target.value)
                      }
                      placeholder="domain.com"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCompetitor(idx)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {form.competitors.length === 0 && (
                  <p className="text-sm text-gray-400">
                    No competitors added yet.
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : editingId ? "Update" : "Create"}
                </Button>
                <Button type="button" variant="outline" onClick={closeForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Brand list */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      ) : brands.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">
              No brands yet. Click &quot;Add Brand&quot; to create your first
              one.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {brands.map((brand) => (
            <Card key={brand.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>{brand.name}</CardTitle>
                  <CardDescription>{brand.domain}</CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditForm(brand)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteBrand(brand.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {brand.description && (
                  <p className="text-sm text-gray-600">{brand.description}</p>
                )}

                {brand.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {brand.keywords.map((kw) => (
                      <Badge key={kw} variant="secondary">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                )}

                {brand.competitors.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-gray-500">
                      Competitors
                    </p>
                    <ul className="space-y-1">
                      {brand.competitors.map((c, i) => (
                        <li key={i} className="text-sm text-gray-600">
                          {c.name}
                          {c.domain && (
                            <span className="ml-1 text-gray-400">
                              ({c.domain})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
