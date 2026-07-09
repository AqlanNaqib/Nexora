"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchDashboardSummary } from "@/services/dashboard-service";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  FolderSearch,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface Stats {
  total_investigations: number;
  total_documents: number;
  analyzed_documents: number;
  pending_documents: number;
}

interface ActivityPoint {
  date: string;
  uploaded: number;
  analyzed: number;
}

interface RecentDocument {
  id: string;
  filename: string;
  status: string;
  created_at: string;
}

interface RecentInvestigation {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

interface DashboardSummary {
  stats: Stats;
  activity_timeline: ActivityPoint[];
  recent_documents: RecentDocument[];
  recent_investigations: RecentInvestigation[];
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  accent?: "primary" | "success";
}) {
  return (
    <Card className="border-border bg-surface shadow-none">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold text-foreground mt-1.5 font-mono">
              {value}
            </p>
          </div>
          <div
            className={`h-9 w-9 rounded-md flex items-center justify-center ${
              accent === "primary"
                ? "bg-primary/10"
                : accent === "success"
                ? "bg-success/10"
                : "bg-muted/30"
            }`}
          >
            <Icon
              className={`h-4 w-4 ${
                accent === "primary"
                  ? "text-primary"
                  : accent === "success"
                  ? "text-success"
                  : "text-muted-foreground"
              }`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const summary = await fetchDashboardSummary();
        if (!ignore) setData(summary);
      } catch (err) {
        if (!ignore) setError("Failed to load dashboard");
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

  return (
    <div>
      <div className="border-b border-border pb-5">
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your investigation workspace
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3 mt-6">
        <StatCard
          label="Investigations"
          value={data.stats.total_investigations}
          icon={FolderSearch}
          accent="primary"
        />
        <StatCard
          label="Total Documents"
          value={data.stats.total_documents}
          icon={FileText}
        />
        <StatCard
          label="Analyzed"
          value={data.stats.analyzed_documents}
          icon={CheckCircle2}
          accent="success"
        />
        <StatCard
          label="Pending"
          value={data.stats.pending_documents}
          icon={Clock}
        />
      </div>

      <div className="mt-6 border border-border rounded-md p-4 bg-surface">
        <p className="text-sm font-medium text-foreground mb-4">
          Activity — Last 30 Days
        </p>
        {data.activity_timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No activity yet
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.activity_timeline}>
              <defs>
                <linearGradient id="uploadedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-muted-foreground)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--color-muted-foreground)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="analyzedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                stroke="var(--color-muted-foreground)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <YAxis
                stroke="var(--color-muted-foreground)"
                fontSize={12}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "var(--color-foreground)" }}
              />
              <Area
                type="monotone"
                dataKey="uploaded"
                stroke="var(--color-muted-foreground)"
                strokeWidth={2}
                fill="url(#uploadedFill)"
                name="Uploaded"
              />
              <Area
                type="monotone"
                dataKey="analyzed"
                stroke="var(--color-primary)"
                strokeWidth={2}
                fill="url(#analyzedFill)"
                name="Analyzed"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="border border-border rounded-md bg-surface">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium text-foreground">
              Recent Investigations
            </p>
          </div>
          <div>
            {data.recent_investigations.length === 0 && (
              <p className="text-sm text-muted-foreground px-4 py-6 text-center">
                No investigations yet
              </p>
            )}
            {data.recent_investigations.map((inv) => (
              <Link
                key={inv.id}
                href={`/dashboard/investigations/${inv.id}`}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-hover transition-colors border-b border-border last:border-0"
              >
                <span className="text-sm text-foreground truncate">
                  {inv.title}
                </span>
                <span className="text-xs text-muted-foreground font-mono shrink-0 ml-2">
                  {new Date(inv.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="border border-border rounded-md bg-surface">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium text-foreground">
              Recent Documents
            </p>
          </div>
          <div>
            {data.recent_documents.length === 0 && (
              <p className="text-sm text-muted-foreground px-4 py-6 text-center">
                No documents yet
              </p>
            )}
            {data.recent_documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-0"
              >
                <span className="text-sm text-foreground truncate">
                  {doc.filename}
                </span>
                <span
                  className={`text-xs shrink-0 ml-2 ${
                    doc.status === "analyzed"
                      ? "text-success"
                      : "text-muted-foreground"
                  }`}
                >
                  {doc.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
