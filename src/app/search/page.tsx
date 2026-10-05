import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/header";
import { SearchContent } from "./search-content";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
    city?: string;
    category?: string;
  }>;
};

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const { q, city, category } = await searchParams;
  const rawCity = (city || q || "").trim();

  // Capitalize city nicely for display
  const targetCity = rawCity
    ? rawCity
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ")
    : "";

  let title = "Search Stays & Hourly Rentals in Kenya and Tanzania";
  let description =
    "Explore vacation rentals, hourly rooms, furnished apartments, and event spaces across Kenya and Tanzania on Beddn.";

  if (targetCity) {
    if (category === "hourly") {
      title = `Hourly Stays & Spaces for Rent in ${targetCity}`;
      description = `Book flexible hourly hotel rooms, day offices, photography studios, and event venues in ${targetCity}. Reserve instantly on Beddn.`;
    } else if (category === "experience") {
      title = `Local Experiences & Guided Activities in ${targetCity}`;
      description = `Discover top-rated guided tours, wildlife excursions, outdoor adventures, and workshops in ${targetCity} on Beddn.`;
    } else {
      title = `Houses & Apartments for Rent in ${targetCity}`;
      description = `Browse verified furnished apartments, vacation homes, and overnight stays for rent in ${targetCity}. Book securely on Beddn.`;
    }
  } else if (category === "hourly") {
    title = "Hourly Stays & Flexible Spaces in Kenya and Tanzania";
    description =
      "Book rooms, photo studios, conference halls, and event spaces by the hour across Kenya and Tanzania. Pay only for the time you need on Beddn.";
  } else if (category === "experience") {
    title = "Unique Local Experiences in Kenya and Tanzania";
    description =
      "Book authentic safari day trips, city tours, cooking workshops, and outdoor adventures with local hosts across Kenya and Tanzania on Beddn.";
  }

  const canonicalUrl = targetCity
    ? `https://beddn.com/search?q=${encodeURIComponent(rawCity)}`
    : "https://beddn.com/search";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      siteName: "Beddn",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

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
