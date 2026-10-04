import { Header } from "@/components/header";

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-stone-200/80 dark:bg-stone-800 ${className}`} />;
}

export default function ReviewLoading() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#faf8f9] text-[#181113] pb-20">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Top Hero Banner & Property Search */}
          <div className="mb-8 rounded-3xl border border-[#f3cfd9]/80 bg-white p-6 sm:p-10 shadow-xs space-y-4">
            <Skeleton className="h-6 w-36 rounded-full bg-[#fdf2f4]" />
            <Skeleton className="h-8 sm:h-11 w-3/4 max-w-lg rounded-xl" />
            <Skeleton className="h-4 w-full max-w-md rounded-md" />

            {/* Property search bar skeleton */}
            <div className="pt-2 max-w-xl">
              <Skeleton className="h-12 w-full rounded-2xl bg-stone-100" />
            </div>
          </div>

          {/* 2-Column Review Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-8 items-start">
            {/* Left Column: Form Skeleton */}
            <div className="space-y-6">
              {/* Selected Property preview */}
              <div className="rounded-3xl border border-stone-200/80 bg-white p-5 flex items-center gap-4">
                <Skeleton className="size-16 rounded-2xl shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-44 rounded-md" />
                  <Skeleton className="h-3.5 w-32 rounded-md" />
                </div>
              </div>

              {/* Star Rating Card */}
              <div className="rounded-3xl border border-[#f3cfd9]/80 bg-white p-6 sm:p-8 shadow-xs text-center space-y-4">
                <Skeleton className="h-6 w-64 mx-auto rounded-md" />
                <Skeleton className="h-3 w-32 mx-auto rounded-md" />
                <div className="flex justify-center gap-3 pt-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="size-10 rounded-xl" />
                  ))}
                </div>
              </div>

              {/* Tags Card */}
              <div className="rounded-3xl border border-[#f3cfd9]/80 bg-white p-6 shadow-xs space-y-3">
                <Skeleton className="h-5 w-36 rounded-md" />
                <Skeleton className="h-3 w-56 rounded-md" />
                <div className="flex flex-wrap gap-2 pt-1">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-24 rounded-full" />
                  ))}
                </div>
              </div>

              {/* Review Textarea Card */}
              <div className="rounded-3xl border border-[#f3cfd9]/80 bg-white p-6 shadow-xs space-y-3">
                <Skeleton className="h-5 w-40 rounded-md" />
                <Skeleton className="h-3 w-64 rounded-md" />
                <Skeleton className="h-28 w-full rounded-2xl" />
              </div>

              {/* Submit Button */}
              <Skeleton className="h-12 w-full rounded-full bg-[#800020]/25" />
            </div>

            {/* Right Column: Community Impact & Showcase Skeleton */}
            <div className="space-y-6">
              {/* Community Impact Card */}
              <div className="overflow-hidden rounded-3xl border border-[#f3cfd9]/80 bg-white shadow-xs">
                <Skeleton className="h-44 w-full rounded-none" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-3.5 w-full rounded-md" />
                  <Skeleton className="h-3.5 w-4/5 rounded-md" />
                  <div className="flex justify-between items-center pt-2">
                    <Skeleton className="h-4 w-40 rounded-md" />
                    <Skeleton className="size-7 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Community Reviews Showcase */}
              <div className="rounded-3xl border border-stone-200/80 bg-white p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <Skeleton className="h-5 w-36 rounded-md" />
                  <Skeleton className="h-4 w-12 rounded-md" />
                </div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2.5 pb-4 border-b border-stone-100 last:border-none">
                    <div className="flex items-center gap-2.5">
                      <Skeleton className="size-8 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-3.5 w-24 rounded-md" />
                        <Skeleton className="h-3 w-16 rounded-md" />
                      </div>
                    </div>
                    <Skeleton className="h-3 w-full rounded-md" />
                    <Skeleton className="h-3 w-4/5 rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
