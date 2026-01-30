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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Brand {
  id: string;
  name: string;
}

interface ContentItem {
  id: string;
  title: string;
  contentType: string;
  status: "idea" | "draft" | "review" | "published";
  aeoScore: number | null;
  brandId: string;
  brandName: string;
}

const STATUSES = ["idea", "draft", "review", "published"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_LABELS: Record<Status, string> = {
  idea: "Idea",
  draft: "Draft",
  review: "Review",
  published: "Published",
};

const STATUS_COLORS: Record<Status, string> = {
  idea: "bg-gray-100 border-gray-300",
  draft: "bg-blue-50 border-blue-300",
  review: "bg-yellow-50 border-yellow-300",
  published: "bg-green-50 border-green-300",
};

const CONTENT_TYPES = [
  "blog-post",
  "landing-page",
  "faq",
  "comparison",
  "guide",
  "case-study",
];

const PROVIDERS = ["openai", "anthropic", "google", "perplexity"];

// ---------------------------------------------------------------------------
// Sortable Card
// ---------------------------------------------------------------------------

function SortableCard({ item }: { item: ContentItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, data: { status: item.status } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="rounded-md border bg-white p-3 shadow-sm">
        <div className="flex items-start gap-2">
          <button {...listeners} className="mt-0.5 cursor-grab text-gray-400">
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-gray-900">{item.title}</p>
            <div className="flex flex-wrap items-center gap-1">
              <Badge variant="outline" className="text-xs">
                {item.contentType}
              </Badge>
              {item.aeoScore !== null && (
                <Badge
                  className={`text-xs ${
                    item.aeoScore >= 70
                      ? "bg-green-100 text-green-800"
                      : item.aeoScore >= 40
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  AEO: {item.aeoScore}
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-400">{item.brandName}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Droppable Column
// ---------------------------------------------------------------------------

function DroppableColumn({
  status,
  items,
}: {
  status: Status;
  items: ContentItem[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[200px] flex-col rounded-lg border-2 p-3 transition-colors ${
        STATUS_COLORS[status]
      } ${isOver ? "ring-2 ring-blue-400" : ""}`}
    >
      <h3 className="mb-3 text-sm font-semibold text-gray-700">
        {STATUS_LABELS[status]}{" "}
        <span className="text-gray-400">({items.length})</span>
      </h3>
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-1 flex-col gap-2">
          {items.length === 0 ? (
            <p className="py-6 text-center text-xs text-gray-400">
              Drop items here
            </p>
          ) : (
            items.map((item) => <SortableCard key={item.id} item={item} />)
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Form
  const [formBrand, setFormBrand] = useState("");
  const [formTopic, setFormTopic] = useState("");
  const [formType, setFormType] = useState("");
  const [formProvider, setFormProvider] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [contentRes, brandsRes] = await Promise.all([
        fetch("/api/content"),
        fetch("/api/brand"),
      ]);
      if (!contentRes.ok) throw new Error("Failed to fetch content");
      if (!brandsRes.ok) throw new Error("Failed to fetch brands");

      const contentData: ContentItem[] = await contentRes.json();
      const brandsData: Brand[] = await brandsRes.json();

      setItems(contentData);
      setBrands(brandsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId: formBrand,
          topic: formTopic,
          contentType: formType,
          provider: formProvider,
        }),
      });
      if (!res.ok) throw new Error("Failed to generate content");
      setShowForm(false);
      setFormBrand("");
      setFormTopic("");
      setFormType("");
      setFormProvider("");
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(itemId: string, newStatus: Status) {
    try {
      const res = await fetch(`/api/content/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update content status");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      await fetchData(); // revert on failure
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const overId = over.id as string;

    // Determine target status: either the column id or the status of the item dropped onto
    let targetStatus: Status | undefined;

    if (STATUSES.includes(overId as Status)) {
      targetStatus = overId as Status;
    } else {
      const overItem = items.find((i) => i.id === overId);
      if (overItem) targetStatus = overItem.status;
    }

    if (!targetStatus) return;

    const activeItem = items.find((i) => i.id === active.id);
    if (!activeItem || activeItem.status === targetStatus) return;

    // Optimistic update
    setItems((prev) =>
      prev.map((i) =>
        i.id === active.id ? { ...i, status: targetStatus } : i
      )
    );

    updateStatus(active.id as string, targetStatus);
  }

  const activeItem = activeId ? items.find((i) => i.id === activeId) : null;

  const itemsByStatus: Record<Status, ContentItem[]> = {
    idea: items.filter((i) => i.status === "idea"),
    draft: items.filter((i) => i.status === "draft"),
    review: items.filter((i) => i.status === "review"),
    published: items.filter((i) => i.status === "published"),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Pipeline</h1>
          <p className="text-sm text-gray-500">
            Manage and generate AEO-optimized content
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Generate Content
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Generate form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Generate Content</CardTitle>
            <CardDescription>
              Create AEO-optimized content using AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  <Label>Topic</Label>
                  <Input
                    value={formTopic}
                    onChange={(e) => setFormTopic(e.target.value)}
                    placeholder="Best practices for..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Content Type</Label>
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select value={formProvider} onValueChange={setFormProvider}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Generating..." : "Generate"}
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

      {/* Tabs */}
      {loading ? (
        <Skeleton className="h-96 w-full rounded-lg" />
      ) : (
        <Tabs defaultValue="board">
          <TabsList>
            <TabsTrigger value="board">Board</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
          </TabsList>

          {/* Kanban Board */}
          <TabsContent value="board">
            <DndContext
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {STATUSES.map((status) => (
                  <DroppableColumn
                    key={status}
                    status={status}
                    items={itemsByStatus[status]}
                  />
                ))}
              </div>

              <DragOverlay>
                {activeItem ? (
                  <div className="rounded-md border bg-white p-3 shadow-lg">
                    <p className="text-sm font-medium">{activeItem.title}</p>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </TabsContent>

          {/* List View */}
          <TabsContent value="list">
            {items.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500">
                    No content items yet. Click &quot;Generate Content&quot; to
                    start.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="overflow-hidden rounded-lg border bg-white">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Title
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        AEO Score
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Brand
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {item.title}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{item.contentType}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={
                              item.status === "published"
                                ? "bg-green-100 text-green-800"
                                : item.status === "review"
                                ? "bg-yellow-100 text-yellow-800"
                                : item.status === "draft"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {STATUS_LABELS[item.status]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.aeoScore !== null ? item.aeoScore : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.brandName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
