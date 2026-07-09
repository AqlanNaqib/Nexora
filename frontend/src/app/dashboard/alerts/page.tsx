"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAlerts } from "@/services/dashboard-service";
import { AlertTriangle, Clock, ShieldAlert } from "lucide-react";

interface Alert {
  id: string;
  type: string;
  message: string;
  created_at: string;
  investigation_id?: string | null;
  investigations?: { title: string } | null;
}

const alertConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  contradiction: {
    icon: AlertTriangle,
    color: "text-danger",
    label: "Contradiction",
  },
  stale_document: {
    icon: Clock,
    color: "text-muted-foreground",
    label: "Stale Document",
  },
};


export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const data = await fetchAlerts();
        if (!ignore) setAlerts(data);
      } catch (err) {
        if (!ignore) setError("Failed to load alerts");
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div>
      <div className="border-b border-border pb-5">
        <h1 className="text-xl font-semibold text-foreground">Alerts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {alerts.length} active alert{alerts.length !== 1 && "s"}
        </p>
      </div>

      {error && (
        <p className="text-sm text-danger mt-4 border border-danger/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="mt-4">
        {alerts.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border rounded-lg">
            <ShieldAlert className="h-8 w-8 text-muted-foreground/50 mb-3" />
            <p className="text-foreground text-sm font-medium">
              No alerts right now
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Contradictions and stale documents will show up here
            </p>
          </div>
        )}

        {alerts.map((alert) => {
          const config = alertConfig[alert.type] || alertConfig.stale_document;
          const Icon = config.icon;

          const content = (
            <div className="flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
              <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.color}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${config.color}`}>
                    {config.label}
                  </span>
                  {alert.investigations?.title && (
                    <span className="text-xs text-muted-foreground">
                      · {alert.investigations.title}
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground mt-1">
                  {alert.message}
                </p>
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  {new Date(alert.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          );

          return alert.investigation_id ? (
            <Link
              key={alert.id}
              href={`/dashboard/investigations/${alert.investigation_id}`}
            >
              {content}
            </Link>
          ) : (
            <div key={alert.id}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}
