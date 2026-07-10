"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchInvestigations,
  createInvestigation,
} from "@/services/investigations-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { ListRowSkeleton } from "@/components/ui/list-skeleton";
import { Plus, FolderSearch, X } from "lucide-react";

interface Investigation {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
}

export default function InvestigationsPage() {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function startFetching() {
      setLoading(true);
      try {
        const data = await fetchInvestigations(page, pageSize);
        if (!ignore) {
          setInvestigations(data.investigations);
          setTotalPages(data.total_pages);
          setTotal(data.total);
        }
      } catch (err) {
        if (!ignore) setError("Failed to load investigations");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    startFetching();

    return () => {
      ignore = true;
    };
  }, [page]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setCreating(true);
    setError(null);
    try {
      await createInvestigation(title, description || undefined);
      setTitle("");
      setDescription("");
      setShowForm(false);
      setPage(1);
      const data = await fetchInvestigations(1, pageSize);
      setInvestigations(data.investigations);
      setTotalPages(data.total_pages);
      setTotal(data.total);
    } catch (err) {
      setError("Failed to create investigation");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Investigations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} case{total !== 1 && "s"}
          </p>
        </div>

        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? (
            <X className="h-3.5 w-3.5" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          {showForm ? "Cancel" : "New Investigation"}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mt-4 border border-border rounded-md p-4 space-y-3"
        >
          <Input
            placeholder="Investigation title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Input
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button type="submit" size="sm" disabled={creating}>
            {creating ? "Creating..." : "Create Investigation"}
          </Button>
        </form>
      )}

      {error && (
        <p className="text-sm text-danger mt-4 border border-danger/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="mt-4">
        {loading ? (
          <ListRowSkeleton count={pageSize} />
        ) : investigations.length === 0 && !showForm ? (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border rounded-lg">
            <FolderSearch className="h-8 w-8 text-muted-foreground/50 mb-3" />
            <p className="text-foreground text-sm font-medium">
              No investigations yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Create your first case to start organizing documents
            </p>
          </div>
        ) : (
          investigations.map((inv) => (
            <Link key={inv.id} href={`/dashboard/investigations/${inv.id}`}>
              <Card className="border-border border-x-0 border-t-0 rounded-none first:rounded-t-md last:rounded-b-md shadow-none hover:bg-surface-hover transition-colors cursor-pointer">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {inv.title}
                      </p>
                      {inv.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {inv.description}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      {new Date(inv.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

      <PaginationControls
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
      />
    </div>
  );
}
