import { Header } from "@/components/header";

function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-[#f1e6ea] ${className}`} />;
}

export default function PropertyLoading() {
  return (
    <>
      <Header />
      <main className="bg-white text-[#181113]">
        <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <Bar className="mb-5 h-4 w-28" />
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <Bar className="h-8 w-72 max-w-full" />
              <Bar className="h-4 w-56 max-w-full bg-muted" />
            </div>
            <div className="flex gap-2">
              <Bar className="h-8 w-20" />
              <Bar className="h-8 w-28" />
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
            <div className="aspect-[16/10] animate-pulse rounded-2xl bg-muted sm:aspect-[16/8]" />
            <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="aspect-[4/3] animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
          <div className="space-y-8">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-3">
                <Bar className="h-6 w-44" />
                <Bar className="h-4 w-full bg-muted" />
                <Bar className="h-4 w-3/4 bg-muted" />
              </div>
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-2xl border bg-white shadow-sm" />
        </section>
      </main>
    </>
  );
}
