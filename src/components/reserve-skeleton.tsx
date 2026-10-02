import Link from "next/link";

export function ReserveSkeleton() {
  return (
    <>
      <header className="border-b border-[#f3cfd9]/60 bg-white/95 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-brand text-2xl font-bold tracking-tight text-[#2b000a]">Beddn</span>
          </Link>
          <div className="h-8 w-28 rounded-full bg-[#fbf0f3] animate-pulse" />
        </div>
      </header>

      <main className="bg-[#fffdfd] min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Left Column (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Header */}
            <div className="space-y-2">
              <div className="h-8 w-64 rounded-xl bg-neutral-200 animate-pulse" />
              <div className="h-4 w-96 max-w-full rounded-md bg-neutral-100 animate-pulse" />
            </div>

            <div className="space-y-4">
              {/* Card 1 Skeleton: Expanded */}
              <div className="rounded-3xl border border-[#f3cfd9]/80 bg-white p-6 sm:p-7 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#f3cfd9]/40 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-full bg-[#fbf0f3] animate-pulse" />
                    <div className="h-5 w-44 rounded-md bg-neutral-200 animate-pulse" />
                  </div>
                  <div className="h-4 w-16 rounded-full bg-[#fbf0f3] animate-pulse" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-20 rounded bg-neutral-200 animate-pulse" />
                    <div className="h-11 rounded-2xl bg-neutral-100 animate-pulse" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-20 rounded bg-neutral-200 animate-pulse" />
                    <div className="h-11 rounded-2xl bg-neutral-100 animate-pulse" />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <div className="h-3.5 w-36 rounded bg-neutral-200 animate-pulse" />
                    <div className="h-11 rounded-2xl bg-neutral-100 animate-pulse" />
                    <div className="h-3 w-64 rounded bg-neutral-100 animate-pulse" />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <div className="h-3.5 w-24 rounded bg-neutral-200 animate-pulse" />
                    <div className="h-11 rounded-2xl bg-neutral-100 animate-pulse" />
                  </div>
                </div>

                <div className="pt-2">
                  <div className="h-11 w-full rounded-2xl bg-[#800020]/20 animate-pulse" />
                </div>
              </div>

              {/* Card 2 Skeleton: Collapsed */}
              <div className="flex items-center justify-between rounded-2xl border border-[#f3cfd9]/80 bg-white px-5 py-3.5 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="size-7 rounded-full bg-[#fbf0f3] animate-pulse" />
                  <div className="space-y-1">
                    <div className="h-4 w-40 rounded bg-neutral-200 animate-pulse" />
                    <div className="h-3 w-48 rounded bg-neutral-100 animate-pulse" />
                  </div>
                </div>
                <div className="h-3.5 w-10 rounded bg-[#f3cfd9] animate-pulse" />
              </div>

              {/* Info callout skeleton */}
              <div className="h-14 w-full rounded-2xl bg-[#fbf0f3] border border-[#f3cfd9] animate-pulse" />

              {/* Submit button skeleton */}
              <div className="h-13 w-full rounded-full bg-[#800020]/25 animate-pulse" />
            </div>
          </div>

          {/* Right Column (lg:col-span-5) */}
          <aside className="lg:col-span-5 space-y-5 lg:sticky lg:top-24 self-start">
            {/* Property Card Skeleton */}
            <div className="overflow-hidden rounded-3xl border border-[#f3cfd9]/90 bg-white shadow-xs p-5 sm:p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 flex-1">
                  <div className="h-5 w-3/4 rounded bg-neutral-200 animate-pulse" />
                  <div className="h-3.5 w-1/2 rounded bg-neutral-100 animate-pulse" />
                </div>
                <div className="size-20 shrink-0 rounded-2xl bg-[#f1e6ea] animate-pulse" />
              </div>
              <div className="h-px bg-[#f3cfd9]/50" />
              <div className="space-y-2.5">
                <div className="h-4 w-28 rounded bg-neutral-200 animate-pulse" />
                <div className="h-3.5 w-40 rounded bg-neutral-100 animate-pulse" />
              </div>
              <div className="h-px bg-[#f3cfd9]/50" />
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 rounded bg-neutral-200 animate-pulse" />
                <div className="h-6 w-20 rounded bg-neutral-200 animate-pulse" />
              </div>
            </div>

            {/* Support Card Skeleton */}
            <div className="rounded-3xl border border-[#f3cfd9]/90 bg-white p-5 shadow-xs space-y-3">
              <div className="h-4 w-32 rounded bg-neutral-200 animate-pulse" />
              <div className="h-3 w-48 rounded bg-neutral-100 animate-pulse" />
              <div className="space-y-2 pt-1">
                <div className="h-12 rounded-2xl bg-[#fbf0f3]/70 border border-[#f3cfd9] animate-pulse" />
                <div className="h-12 rounded-2xl bg-[#fbf0f3]/70 border border-[#f3cfd9] animate-pulse" />
              </div>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
