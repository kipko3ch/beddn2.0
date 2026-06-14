"use client";

function Pulse({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[#eee5e8] ${className}`} />;
}

export function DashboardOverviewSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading dashboard">
      <div className="space-y-3">
        <Pulse className="h-7 w-32 rounded-full" />
        <Pulse className="h-10 w-72 max-w-full" />
        <Pulse className="h-4 w-56 max-w-full bg-[#f4edef]" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Pulse className="h-56 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Pulse key={index} className="h-28 rounded-2xl bg-white" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Pulse key={index} className="h-32 rounded-2xl bg-white" />
        ))}
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function DashboardTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border" role="status" aria-label="Loading records">
      <div className="border-b bg-muted/40 p-3">
        <Pulse className="h-5 w-40" />
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 p-3">
            <Pulse className="h-4 w-1/4" />
            <Pulse className="h-4 w-1/5 bg-[#f4edef]" />
            <Pulse className="hidden h-4 w-1/6 sm:block" />
            <Pulse className="ml-auto h-8 w-20 rounded-full" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function DashboardStatsSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading analytics">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Pulse key={index} className="h-28 rounded-2xl bg-white" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Pulse className="h-64 rounded-2xl bg-white" />
        <Pulse className="h-64 rounded-2xl bg-white" />
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function DashboardListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading content">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="rounded-2xl border bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <Pulse className="h-5 w-48 max-w-full" />
              <Pulse className="h-4 w-72 max-w-full bg-[#f4edef]" />
              <div className="flex gap-2">
                <Pulse className="h-6 w-16 rounded-full" />
                <Pulse className="h-6 w-24 rounded-full" />
              </div>
            </div>
            <div className="hidden gap-2 sm:flex">
              <Pulse className="h-9 w-24 rounded-full" />
              <Pulse className="h-9 w-20 rounded-full" />
            </div>
          </div>
        </div>
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}
