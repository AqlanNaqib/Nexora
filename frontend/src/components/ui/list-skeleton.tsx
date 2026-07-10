import { Skeleton } from "@/components/ui/skeleton";

export function ListRowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border last:border-0"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Skeleton className="h-4 w-4 rounded shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-5 w-16 rounded" />
        </div>
      ))}
    </div>
  );
}
