import { Header } from "@/components/header";

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-stone-200/80 dark:bg-stone-800 ${className}`} />;
}

export default function PropertyLoading() {
  return (
    <>
      <Header />
      <main className="bg-white text-[#181113] min-h-screen">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          {/* Top Breadcrumb & Action Buttons */}
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-4 w-32 rounded-full" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-20 rounded-full" />
              <Skeleton className="h-9 w-20 rounded-full" />
              <Skeleton className="h-9 w-24 rounded-full" />
            </div>
          </div>

          {/* Title & Metadata */}
          <div className="mb-6 space-y-2.5">
            <Skeleton className="h-8 sm:h-10 w-3/4 max-w-xl rounded-xl" />
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-4 w-48 rounded-md" />
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-4 w-20 rounded-md" />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Skeleton className="h-6 w-24 rounded-full bg-[#fdf2f4]" />
              <Skeleton className="h-6 w-28 rounded-full bg-[#fdf2f4]" />
              <Skeleton className="h-6 w-28 rounded-full bg-emerald-50/50" />
            </div>
          </div>

          {/* 5-Photo Interactive Gallery Grid (Accurate Property View) */}
          <div className="mb-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2 h-[340px] sm:h-[420px] lg:h-[480px]">
            {/* Main Featured Photo (Left half) */}
            <Skeleton className="h-full w-full sm:col-span-1 lg:col-span-2 lg:row-span-2 rounded-2xl" />
            {/* 4 Supporting Photos (Right half) */}
            <Skeleton className="hidden sm:block h-full w-full rounded-2xl" />
            <Skeleton className="hidden sm:block h-full w-full rounded-2xl" />
            <Skeleton className="hidden lg:block h-full w-full rounded-2xl" />
            <Skeleton className="hidden lg:block h-full w-full rounded-2xl" />
          </div>

          {/* 2-Column Property Details Grid */}
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] pb-16">
            {/* Left Column: Details, Host, Amenities, Reviews */}
            <div className="space-y-8">
              {/* Host Profile Bar */}
              <div className="flex items-center justify-between pb-6 border-b border-stone-100">
                <div className="flex items-center gap-4">
                  <Skeleton className="size-14 rounded-full shrink-0" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-5 w-40 rounded-md" />
                    <Skeleton className="h-3.5 w-60 rounded-md" />
                  </div>
                </div>
                <Skeleton className="h-8 w-28 rounded-full bg-[#fdf2f4]" />
              </div>

              {/* Key Features Highlights (Self check-in, dedicated workspace, location) */}
              <div className="space-y-4 pb-6 border-b border-stone-100">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-3.5">
                    <Skeleton className="size-9 rounded-xl shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-44 rounded-md" />
                      <Skeleton className="h-3 w-3/4 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>

              {/* About this space */}
              <div className="space-y-3 pb-6 border-b border-stone-100">
                <Skeleton className="h-6 w-36 rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-11/12 rounded-md" />
                <Skeleton className="h-4 w-4/5 rounded-md" />
                <Skeleton className="h-4 w-2/3 rounded-md" />
              </div>

              {/* Where you will sleep */}
              <div className="space-y-3 pb-6 border-b border-stone-100">
                <Skeleton className="h-6 w-48 rounded-md" />
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-stone-200/80 p-4 space-y-2">
                    <Skeleton className="size-6 rounded-md" />
                    <Skeleton className="h-4 w-24 rounded-md" />
                    <Skeleton className="h-3 w-16 rounded-md" />
                  </div>
                </div>
              </div>

              {/* Amenities Grid */}
              <div className="space-y-4 pb-6 border-b border-stone-100">
                <Skeleton className="h-6 w-44 rounded-md" />
                <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="size-5 rounded-md shrink-0" />
                      <Skeleton className="h-4 w-32 rounded-md" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Calendar / Availability */}
              <div className="space-y-4 pb-6 border-b border-stone-100">
                <Skeleton className="h-6 w-40 rounded-md" />
                <Skeleton className="h-4 w-64 rounded-md" />
                <div className="rounded-2xl border border-stone-200/80 p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-5 w-32 rounded-md" />
                    <div className="flex gap-2">
                      <Skeleton className="size-8 rounded-full" />
                      <Skeleton className="size-8 rounded-full" />
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-2 pt-2">
                    {Array.from({ length: 28 }).map((_, i) => (
                      <Skeleton key={i} className="aspect-square rounded-xl" />
                    ))}
                  </div>
                </div>
              </div>

              {/* Reviews Summary */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-6 rounded-md" />
                  <Skeleton className="h-6 w-48 rounded-md" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="rounded-2xl border border-stone-100 bg-stone-50/50 p-4 space-y-2.5">
                      <div className="flex items-center gap-2.5">
                        <Skeleton className="size-10 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-28 rounded-md" />
                          <Skeleton className="h-3 w-20 rounded-md" />
                        </div>
                      </div>
                      <Skeleton className="h-3 w-full rounded-md" />
                      <Skeleton className="h-3 w-4/5 rounded-md" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Sticky Reservation Booking Card */}
            <div>
              <div className="sticky top-24 rounded-3xl border border-stone-200/90 bg-white p-6 shadow-xl space-y-5">
                <div className="flex items-baseline justify-between border-b border-stone-100 pb-4">
                  <div className="flex items-baseline gap-1.5">
                    <Skeleton className="h-8 w-28 rounded-md" />
                    <Skeleton className="h-4 w-12 rounded-md" />
                  </div>
                  <Skeleton className="h-4 w-16 rounded-md" />
                </div>

                {/* Date & Guests Box */}
                <div className="rounded-2xl border border-stone-200 divide-y divide-stone-200 overflow-hidden">
                  <div className="grid grid-cols-2 divide-x divide-stone-200 p-3">
                    <div className="space-y-1">
                      <Skeleton className="h-2.5 w-14 rounded-xs" />
                      <Skeleton className="h-4 w-20 rounded-md" />
                    </div>
                    <div className="pl-3 space-y-1">
                      <Skeleton className="h-2.5 w-16 rounded-xs" />
                      <Skeleton className="h-4 w-20 rounded-md" />
                    </div>
                  </div>
                  <div className="p-3 space-y-1">
                    <Skeleton className="h-2.5 w-12 rounded-xs" />
                    <Skeleton className="h-4 w-28 rounded-md" />
                  </div>
                </div>

                {/* Primary CTA */}
                <Skeleton className="h-12 w-full rounded-2xl bg-[#800020]/25" />
                <Skeleton className="h-3 w-44 mx-auto rounded-md" />

                {/* Calculation Rows */}
                <div className="space-y-2.5 pt-2 border-t border-stone-100 text-xs">
                  <div className="flex justify-between">
                    <Skeleton className="h-3.5 w-32 rounded-md" />
                    <Skeleton className="h-3.5 w-20 rounded-md" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-3.5 w-24 rounded-md" />
                    <Skeleton className="h-3.5 w-16 rounded-md" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-3.5 w-28 rounded-md" />
                    <Skeleton className="h-3.5 w-16 rounded-md" />
                  </div>
                  <div className="flex justify-between pt-2 border-t border-stone-100 font-bold">
                    <Skeleton className="h-5 w-20 rounded-md" />
                    <Skeleton className="h-5 w-24 rounded-md" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
