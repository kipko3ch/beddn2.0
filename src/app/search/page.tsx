"use client";

import { Suspense } from "react";
import { Header } from "@/components/header";
import { SearchContent } from "./search-content";

export default function SearchPage() {
  return (
    <>
      <Header />
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        }
      >
        <SearchContent />
      </Suspense>
    </>
  );
}
