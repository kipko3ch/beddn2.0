import Link from "next/link";

function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-[#f1e6ea] ${className}`} />;
}

/**
 * Matches the real /reserve/[id] page shape (eyebrow + title, 3-step stepper,
 * one active card, sticky order summary, fixed bottom action bar) so there's
 * no layout jump when the real content mounts. Shared by the route-level
 * loading.tsx and the in-page loading state.
 */
export function ReserveSkeleton() {
  return (
    <>
      <header className="border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center font-brand text-2xl leading-none text-[#2b000a]">
            Beddn
          </Link>
          <Bar className="h-4 w-24" />
        </div>
      </header>
      <main className="bg-[#fffdfd] px-4 pb-32 pt-6 sm:px-6 lg:px-8 lg:pb-12">
        <div className="mx-auto mb-6 max-w-6xl">
          <Bar className="h-4 w-32" />
          <Bar className="mt-2 h-8 w-72 max-w-full bg-muted" />
          <div className="mt-4 flex items-center gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-1 flex-col gap-1.5">
                <Bar className={`h-1.5 w-full ${i === 0 ? "" : "bg-[#f1e6ea]"}`} />
                <Bar className="h-3 w-16 bg-muted" />
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
            <Bar className="h-6 w-56 bg-muted" />
            <Bar className="mt-2 h-4 w-72 max-w-full bg-muted" />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Bar className="h-3 w-20 bg-muted" />
                  <div className="h-11 animate-pulse rounded-xl bg-muted" />
                </div>
              ))}
              <div className="h-24 animate-pulse rounded-2xl bg-[#fbf7f8] sm:col-span-2" />
            </div>
          </section>

          <aside className="hidden overflow-hidden rounded-2xl border bg-white shadow-sm lg:sticky lg:top-24 lg:block lg:self-start">
            <div className="p-5">
              <div className="flex gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <Bar className="h-5 w-3/4 bg-muted" />
                  <Bar className="h-4 w-1/3 bg-muted" />
                  <Bar className="h-4 w-1/2 bg-muted" />
                </div>
                <div className="size-24 shrink-0 animate-pulse rounded-lg bg-muted" />
              </div>
              <div className="my-5 h-px bg-border" />
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="mt-0.5 size-4 shrink-0 animate-pulse rounded-full bg-muted" />
                    <Bar className="h-4 w-full bg-muted" />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3 border-t bg-[#fbf7f8] p-5">
              <div className="flex justify-between">
                <Bar className="h-4 w-28 bg-white" />
                <Bar className="h-4 w-16 bg-white" />
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between">
                <Bar className="h-5 w-32 bg-white" />
                <Bar className="h-5 w-20 bg-white" />
              </div>
            </div>
          </aside>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="h-11 w-20 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Bar className="h-3 w-24 bg-muted" />
            <Bar className="h-4 w-32 bg-muted" />
          </div>
          <div className="h-11 w-36 shrink-0 animate-pulse rounded-full bg-[#f1e6ea]" />
        </div>
      </div>
    </>
  );
}
