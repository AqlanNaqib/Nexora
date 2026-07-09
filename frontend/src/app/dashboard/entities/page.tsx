"use client";

import { useEffect, useState } from "react";
import {
  fetchEntitiesSummary,
  deleteEntity,
} from "@/services/dashboard-service";
import { resetAllAnalysis } from "@/services/documents-service";
import { Button } from "@/components/ui/button";
import {
  Users,
  Building2,
  Calendar,
  MapPin,
  X,
  RotateCcw,
} from "lucide-react";

interface EntityItem {
  name: string;
  count: number;
  documents: string[];
}

interface EntitiesSummary {
  people: EntityItem[];
  organizations: EntityItem[];
  dates: EntityItem[];
  locations: EntityItem[];
}

const categoryConfig = {
  people: { label: "People", icon: Users },
  organizations: { label: "Organizations", icon: Building2 },
  dates: { label: "Dates", icon: Calendar },
  locations: { label: "Locations", icon: MapPin },
};

function EntityColumn({
  category,
  items,
  onDelete,
}: {
  category: keyof typeof categoryConfig;
  items: EntityItem[];
  onDelete: (category: string, name: string) => void;
}) {
  const { label, icon: Icon } = categoryConfig[category];

  return (
    <div className="border border-border rounded-md bg-surface">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">{label}</p>
        <span className="text-xs text-muted-foreground ml-auto font-mono">
          {items.length}
        </span>
      </div>
      <div>
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground px-4 py-6 text-center">
            None found yet
          </p>
        )}
        {items.map((item) => (
          <div
            key={item.name}
            className="group px-4 py-2.5 border-b border-border last:border-0 flex items-center justify-between"
            title={item.documents.join(", ")}
          >
            <span className="text-sm text-foreground truncate">
              {item.name}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {item.count > 1 && (
                <span className="text-xs text-primary font-mono bg-primary/10 px-1.5 py-0.5 rounded">
                  {item.count}
                </span>
              )}
              <button
                onClick={() => onDelete(category, item.name)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-danger transition-opacity"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EntitiesPage() {
  const [data, setData] = useState<EntitiesSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const summary = await fetchEntitiesSummary();
        if (!ignore) setData(summary);
      } catch (err) {
        if (!ignore) setError("Failed to load entities");
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, []);

  const handleDeleteEntity = async (category: string, name: string) => {
    if (!confirm(`Remove "${name}" from all documents?`)) return;

    try {
      await deleteEntity(category, name);
      const summary = await fetchEntitiesSummary();
      setData(summary);
    } catch (err) {
      setError("Failed to remove entity");
    }
  };

  const handleReset = async () => {
    if (
      !confirm(
        "Clear all extracted entities and summaries? Documents themselves will remain — you can re-analyze them anytime."
      )
    )
      return;

    setResetting(true);
    try {
      await resetAllAnalysis();
      const summary = await fetchEntitiesSummary();
      setData(summary);
    } catch (err) {
      setError("Failed to reset analysis");
    } finally {
      setResetting(false);
    }
  };

  if (!data) {
    return (
      <div className="text-sm text-muted-foreground">
        {error || "Loading..."}
      </div>
    );
  }

  const totalEntities =
    data.people.length +
    data.organizations.length +
    data.dates.length +
    data.locations.length;

  return (
    <div>
      <div className="flex items-start justify-between border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Entities</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalEntities} unique entities extracted across your analyzed
            documents
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={resetting || totalEntities === 0}
          onClick={handleReset}
          className="gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {resetting ? "Clearing..." : "Clear All"}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-danger mt-4 border border-danger/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 mt-6">
        <EntityColumn
          category="people"
          items={data.people}
          onDelete={handleDeleteEntity}
        />
        <EntityColumn
          category="organizations"
          items={data.organizations}
          onDelete={handleDeleteEntity}
        />
        <EntityColumn
          category="dates"
          items={data.dates}
          onDelete={handleDeleteEntity}
        />
        <EntityColumn
          category="locations"
          items={data.locations}
          onDelete={handleDeleteEntity}
        />
      </div>
    </div>
  );
}
