import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/header";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="relative mb-6 h-48 w-48 sm:h-56 sm:w-56">
          <Image
            src="/images/state-404.png"
            alt="Page not found"
            fill
            className="object-contain"
          />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#2b000a] sm:text-3xl">
          Stay or page not found
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground sm:text-base">
          This listing may have been unlisted, moved, or the link might be broken.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className={buttonVariants({ className: "bg-[#800020] hover:bg-[#600018] text-white" })}
          >
            Back to Home
          </Link>
          <Link href="/search" className={buttonVariants({ variant: "outline" })}>
            Browse All Stays
          </Link>
        </div>
      </main>
    </>
  );
}
