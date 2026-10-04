import { Header } from "@/components/header";
import { ListingCardSkeleton } from "@/components/listing-card";

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-stone-200/80 dark:bg-stone-800 ${className}`} />;
}

export default function SearchLoading() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#faf8f9] text-[#181113] pb-20">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Filter Pills row */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 [scrollbar-width:none]">
            <Skeleton className="h-9 w-24 rounded-full shrink-0" />
            <Skeleton className="h-9 w-28 rounded-full shrink-0" />
            <Skeleton className="h-9 w-20 rounded-full shrink-0" />
            <Skeleton className="h-9 w-32 rounded-full shrink-0" />
            <Skeleton className="h-9 w-24 rounded-full shrink-0" />
            <Skeleton className="h-9 w-28 rounded-full shrink-0" />
          </div>

          {/* Results count & sorting bar */}
          <div className="flex items-center justify-between py-4 border-b border-stone-200/70 mb-6">
            <Skeleton className="h-5 w-44 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-full" />
          </div>

          {/* Listings Grid */}
          <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
