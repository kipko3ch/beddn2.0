"use client";

import { Suspense } from "react";
import { Header } from "@/components/header";
import { SearchContent } from "./search-content";

export default function SearchPage() {
  return (
    <>
      <Header />
      <Suspense fallback={null}>
        <SearchContent />
      </Suspense>
    </>
  );
}
