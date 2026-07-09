"use client";

import { useEffect, useState } from "react";
import { fetchEntitiesSummary } from "@/services/dashboard-service";
import { Users, Building2, Calendar, MapPin } from "lucide-react";

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
}: {
  category: keyof typeof categoryConfig;
  items: EntityItem[];
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
            className="px-4 py-2.5 border-b border-border last:border-0"
            title={item.documents.join(", ")}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground truncate">
                {item.name}
              </span>
              {item.count > 1 && (
                <span className="text-xs text-primary font-mono shrink-0 ml-2 bg-primary/10 px-1.5 py-0.5 rounded">
                  {item.count}
                </span>
              )}
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
      <div className="border-b border-border pb-5">
        <h1 className="text-xl font-semibold text-foreground">Entities</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {totalEntities} unique entities extracted across your analyzed
          documents
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6">
        <EntityColumn category="people" items={data.people} />
        <EntityColumn category="organizations" items={data.organizations} />
        <EntityColumn category="dates" items={data.dates} />
        <EntityColumn category="locations" items={data.locations} />
      </div>
    </div>
  );
}
