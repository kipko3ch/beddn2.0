import { Header } from "@/components/header";

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-stone-200/80 dark:bg-stone-800 ${className}`} />;
}

export default function ExperienceLoading() {
  return (
    <>
      <Header />
      <main className="bg-white text-[#181113] min-h-screen">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          {/* Breadcrumb & Actions */}
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-4 w-32 rounded-full" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-20 rounded-full" />
              <Skeleton className="h-9 w-20 rounded-full" />
            </div>
          </div>

          {/* Title & Metadata */}
          <div className="mb-6 space-y-2.5">
            <Skeleton className="h-8 sm:h-10 w-3/4 max-w-xl rounded-xl" />
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-4 w-48 rounded-md" />
              <Skeleton className="h-4 w-28 rounded-md" />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Skeleton className="h-6 w-28 rounded-full bg-[#fdf2f4]" />
              <Skeleton className="h-6 w-28 rounded-full bg-emerald-50/50" />
            </div>
          </div>

          {/* Photo Gallery Grid */}
          <div className="mb-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2 h-[340px] sm:h-[420px] lg:h-[480px]">
            <Skeleton className="h-full w-full sm:col-span-1 lg:col-span-2 lg:row-span-2 rounded-2xl" />
            <Skeleton className="hidden sm:block h-full w-full rounded-2xl" />
            <Skeleton className="hidden sm:block h-full w-full rounded-2xl" />
            <Skeleton className="hidden lg:block h-full w-full rounded-2xl" />
            <Skeleton className="hidden lg:block h-full w-full rounded-2xl" />
          </div>

          {/* 2-Column Grid */}
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] pb-16">
            <div className="space-y-8">
              {/* Host Bar */}
              <div className="flex items-center justify-between pb-6 border-b border-stone-100">
                <div className="flex items-center gap-4">
                  <Skeleton className="size-14 rounded-full shrink-0" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-5 w-40 rounded-md" />
                    <Skeleton className="h-3.5 w-52 rounded-md" />
                  </div>
                </div>
                <Skeleton className="h-8 w-28 rounded-full bg-[#fdf2f4]" />
              </div>

              {/* What you'll do */}
              <div className="space-y-3 pb-6 border-b border-stone-100">
                <Skeleton className="h-6 w-36 rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-11/12 rounded-md" />
                <Skeleton className="h-4 w-4/5 rounded-md" />
              </div>

              {/* What's included */}
              <div className="space-y-4 pb-6 border-b border-stone-100">
                <Skeleton className="h-6 w-40 rounded-md" />
                <div className="grid grid-cols-2 gap-3.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="size-5 rounded-md shrink-0" />
                      <Skeleton className="h-4 w-32 rounded-md" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Booking Card */}
            <div>
              <div className="sticky top-24 rounded-3xl border border-stone-200/90 bg-white p-6 shadow-xl space-y-5">
                <Skeleton className="h-8 w-32 rounded-md" />
                <Skeleton className="h-14 w-full rounded-2xl" />
                <Skeleton className="h-12 w-full rounded-2xl bg-[#800020]/25" />
                <div className="space-y-2 pt-2 border-t border-stone-100">
                  <Skeleton className="h-3.5 w-full rounded-md" />
                  <Skeleton className="h-3.5 w-2/3 rounded-md" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
