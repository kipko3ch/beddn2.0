"use client";

import { Suspense } from "react";
import { Header } from "@/components/header";
import { SearchContent } from "./search-content";

export default function SearchPage() {
  return (
    <>
      {/* On phones the results page brings its own compact pill header */}
      <div className="hidden md:block">
        <Header />
      </div>
      <Suspense fallback={null}>
        <SearchContent />
      </Suspense>
    </>
  );
}
