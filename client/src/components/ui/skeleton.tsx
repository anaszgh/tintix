import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };

// Specialized skeleton components for the installer app
export function MetricCardSkeleton() {
  return (
    <div className="p-6 bg-card border rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function ChartSkeleton({ height = "h-64" }: { height?: string }) {
  return (
    <div className={cn("bg-card border rounded-lg p-6", height)}>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-end space-x-2">
              <Skeleton className="h-3 w-12" />
              <Skeleton className={`w-4 h-${8 + (i * 4)}`} />
              <Skeleton className={`w-4 h-${12 + (i * 2)}`} />
              <Skeleton className={`w-4 h-${6 + (i * 6)}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function InstallerCardSkeleton() {
  return (
    <div className="p-4 bg-card border rounded-lg space-y-3">
      <div className="flex items-center space-x-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-1 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Skeleton className="h-3 w-16 mb-1" />
          <Skeleton className="h-4 w-8" />
        </div>
        <div>
          <Skeleton className="h-3 w-20 mb-1" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
    </div>
  );
}