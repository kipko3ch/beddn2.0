import Image from "next/image";
import Link from "next/link";
import { LOGO_SRC } from "@/lib/assets";

function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-[#f1e6ea] ${className}`} />;
}

export default function ReserveRouteLoading() {
  return (
    <>
      <header className="border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
            <Image src={LOGO_SRC} alt="Beddn" width={20} height={28} unoptimized className="h-7 w-auto object-contain" />
            <span className="text-lg">Beddn</span>
          </Link>
          <Bar className="h-4 w-24" />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 space-y-3">
          <Bar className="h-4 w-28" />
          <Bar className="h-8 w-72 max-w-full bg-muted" />
          <Bar className="h-4 w-96 max-w-full bg-muted" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            {["Contact details", "Booking details", "Before you pay"].map((label, sectionIndex) => (
              <section key={label} className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="size-8 animate-pulse rounded-full bg-[#f1e6ea]" />
                  <div className="space-y-2">
                    <Bar className="h-5 w-36" />
                    <Bar className="h-3 w-64 max-w-full bg-muted" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {Array.from({ length: sectionIndex === 2 ? 3 : 4 }).map((_, index) => (
                    <div key={index} className="space-y-2">
                      <Bar className="h-3 w-20 bg-muted" />
                      <div className="h-11 animate-pulse rounded-xl bg-muted" />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <aside className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-5 flex gap-4">
              <div className="size-24 animate-pulse rounded-xl bg-muted" />
              <div className="flex-1 space-y-2">
                <Bar className="h-5 w-3/4 bg-muted" />
                <Bar className="h-4 w-1/2 bg-muted" />
              </div>
            </div>
            <div className="space-y-4">
              {Array.from({ length: 7 }).map((_, index) => (
                <Bar key={index} className="h-4 w-full bg-muted" />
              ))}
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
