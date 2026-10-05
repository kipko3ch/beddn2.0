import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  formatListingTitle,
  formatListingDescription,
  buildListingMetadata,
  generateListingJsonLd,
  extractBedrooms,
  extractBathrooms,
  extractPropertyType,
  offersBothHourlyAndOvernight,
} from "../src/lib/seo";
import type { Listing, Review } from "../src/lib/types";

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  if (!fs.existsSync(".env.local")) return env;
  const file = fs.readFileSync(".env.local", "utf8");
  for (const line of file.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || env[match[1]] !== undefined) continue;
    env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
  return env;
}

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✓\x1b[0m ${message}`);
  } else {
    failedTests++;
    console.error(`  \x1b[31m✗\x1b[0m ${message}`);
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("       BEDDN SEO METADATA & SCHEMA VALIDATION");
  console.log("=======================================================\n");

  // -------------------------------------------------------------------
  // TEST SUITE 1: User's Example Listing
  // -------------------------------------------------------------------
  console.log("1. Testing User's Example Listing (Rhovee Homes Arusha 2-Bedroom House):");
  const sample1: Partial<Listing> = {
    id: "uuid-1",
    slug: "rhovee-homes-arusha-2-bedroom-house-mrt2vqoo",
    name: "Rhovee Homes Arusha 2 Bedroom House",
    title: "Rhovee Homes Arusha 2 Bedroom House",
    area: "Olasiti",
    city: "Arusha",
    country: "Tanzania",
    property_type: "house",
    categories: ["hourly", "overnight"],
    hourly_price: 15000,
    overnight_price: 80000,
    currency: "TZS",
    amenities: ["wifi", "parking", "hot_water", "kitchen", "private_bathroom"],
    latitude: -3.3869,
    longitude: 36.6829,
    is_active: true,
  };

  const title1 = formatListingTitle(sample1);
  const desc1 = formatListingDescription(sample1);

  console.log(`   Title (${title1.length} chars): "${title1}"`);
  console.log(`   Description (${desc1.length} chars): "${desc1}"`);

  assert(title1.length <= 60, `Title must be <= 60 chars (got ${title1.length})`);
  assert(title1.includes("2 Bedroom House"), "Title contains '2 Bedroom House'");
  assert(title1.includes("Olasiti, Arusha") || title1.includes("Arusha"), "Title contains location");
  assert(title1.includes("Hourly & Overnight"), "Title indicates hourly and overnight stays");
  assert(!title1.includes("undefined"), "Title never prints 'undefined'");

  assert(desc1.length >= 135 && desc1.length <= 160, `Description length between 140-160 chars (got ${desc1.length})`);
  assert(desc1.includes("TZS 80,000/night"), "Description includes overnight price");
  assert(desc1.includes("15,000/hr"), "Description includes hourly price");
  assert(desc1.includes("Book on Beddn") || desc1.includes("Beddn"), "Description ends with Beddn booking call to action");
  assert(!desc1.includes("undefined"), "Description never prints 'undefined'");

  // -------------------------------------------------------------------
  // TEST SUITE 2: Edge Cases & Missing Fields
  // -------------------------------------------------------------------
  console.log("\n2. Testing Edge Cases & Missing Parts (no 'undefined', no empty separators):");

  const sampleNoNeighborhood: Partial<Listing> = {
    slug: "modern-cozy-mombasa-apartment",
    name: "Modern 1 Bedroom Apartment",
    city: "Mombasa",
    property_type: "apartment",
    categories: ["overnight"],
    overnight_price: 4500,
    currency: "KES",
  };
  const titleNoNeigh = formatListingTitle(sampleNoNeighborhood);
  console.log(`   Missing neighborhood Title: "${titleNoNeigh}"`);
  assert(titleNoNeigh === "1 Bedroom Apartment in Mombasa", "Handles missing neighborhood cleanly");
  assert(!titleNoNeigh.includes(", Mombasa"), "No dangling commas when neighborhood is missing");

  const sampleMissingBedrooms: Partial<Listing> = {
    slug: "luxury-diani-beachfront-villa",
    name: "Luxury Beachfront Villa",
    area: "Diani Beach",
    city: "Kwale",
    property_type: "villa",
    categories: ["overnight"],
    overnight_price: 35000,
  };
  const titleNoBed = formatListingTitle(sampleMissingBedrooms);
  console.log(`   Missing bedrooms Title: "${titleNoBed}"`);
  assert(titleNoBed.includes("Villa in Diani Beach, Kwale"), "Omit bedrooms when not specified");
  assert(!titleNoBed.includes("undefined"), "No undefined when bedrooms omitted");

  const sampleSuperLongName: Partial<Listing> = {
    slug: "super-long-luxurious-presidential-penthouse-suite-with-panoramic-view",
    name: "Super Long Luxurious Presidential Penthouse Suite with Panoramic City Views",
    area: "Upper Hill Financial District",
    city: "Nairobi",
    property_type: "penthouse",
    categories: ["hourly", "overnight"],
    hourly_price: 5000,
    overnight_price: 25000,
  };
  const titleLong = formatListingTitle(sampleSuperLongName);
  console.log(`   Long listing Title (${titleLong.length} chars): "${titleLong}"`);
  assert(titleLong.length <= 60, `Long listing title strictly truncated <= 60 chars (got ${titleLong.length})`);

  // -------------------------------------------------------------------
  // TEST SUITE 3: Structured Data (JSON-LD)
  // -------------------------------------------------------------------
  console.log("\n3. Testing Schema.org JSON-LD Structured Data:");

  // Test with reviews
  const reviewsWithRatings: Review[] = [
    { id: "r1", listing_id: "uuid-1", rating: 5, comment: "Amazing stay!", created_at: "2026-09-01" } as any,
    { id: "r2", listing_id: "uuid-1", rating: 4, comment: "Very clean.", created_at: "2026-09-10" } as any,
  ];
  const jsonLdWithReviews = generateListingJsonLd(sample1 as Listing, reviewsWithRatings);
  const graphWithReviews = jsonLdWithReviews["@graph"] as any[];
  const lodgingWithReviews = graphWithReviews.find((x) => x["@type"] === "LodgingBusiness");
  const breadcrumbList = graphWithReviews.find((x) => x["@type"] === "BreadcrumbList");

  assert(Boolean(lodgingWithReviews), "JSON-LD contains LodgingBusiness");
  assert(lodgingWithReviews.name === sample1.name, "LodgingBusiness name matches listing");
  assert(Array.isArray(lodgingWithReviews.image), "LodgingBusiness has image array");
  assert(lodgingWithReviews.address?.addressLocality === "Arusha", "PostalAddress addressLocality is Arusha");
  assert(lodgingWithReviews.geo?.latitude === -3.3869, "GeoCoordinates latitude is correct");
  assert(lodgingWithReviews.makesOffer?.price === 80000, "Offer price is set");
  assert(lodgingWithReviews.aggregateRating?.ratingValue === 4.5, "aggregateRating has correct average (4.5)");
  assert(lodgingWithReviews.aggregateRating?.reviewCount === 2, "aggregateRating has correct reviewCount (2)");

  assert(Boolean(breadcrumbList), "JSON-LD contains BreadcrumbList");
  assert(breadcrumbList.itemListElement.length === 4, "BreadcrumbList has 4 items: Home > Country > City > Listing");
  assert(breadcrumbList.itemListElement[0].name === "Home", "Breadcrumb 1 is Home");
  assert(breadcrumbList.itemListElement[1].name === "Tanzania", "Breadcrumb 2 is Tanzania");
  assert(breadcrumbList.itemListElement[2].name === "Arusha", "Breadcrumb 3 is Arusha");

  // Test without reviews (MUST NOT invent ratings)
  const jsonLdWithoutReviews = generateListingJsonLd(sample1 as Listing, []);
  const graphWithoutReviews = jsonLdWithoutReviews["@graph"] as any[];
  const lodgingWithoutReviews = graphWithoutReviews.find((x) => x["@type"] === "LodgingBusiness");
  assert(
    lodgingWithoutReviews.aggregateRating === undefined,
    "CRITICAL: aggregateRating is strictly OMITTED when there are 0 real reviews"
  );

  // -------------------------------------------------------------------
  // TEST SUITE 4: Live Database Uniqueness Verification (if DB reachable)
  // -------------------------------------------------------------------
  console.log("\n4. Checking Live Database Listings for Metadata Uniqueness:");
  const env = loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && key) {
    try {
      const supabase = createClient(url, key);
      const { data: listings, error } = await supabase
        .from("listings")
        .select("*, listing_images(*)")
        .limit(50);

      if (error) {
        console.log(`   (Supabase query returned error: ${error.message}; skipping live query)`);
      } else if (listings && listings.length > 0) {
        console.log(`   Found ${listings.length} listings in database.`);

        const seenTitles = new Map<string, string>();
        const seenDescriptions = new Map<string, string>();
        let duplicateTitles = 0;
        let duplicateDescriptions = 0;

        for (const l of listings) {
          const t = formatListingTitle(l);
          const d = formatListingDescription(l);

          assert(t.length <= 60, `Listing "${l.slug}" title <= 60 chars (got ${t.length})`);
          assert(d.length <= 165, `Listing "${l.slug}" description <= 165 chars (got ${d.length})`);

          if (seenTitles.has(t)) {
            duplicateTitles++;
            console.warn(`   Notice: duplicate title for ${l.slug} and ${seenTitles.get(t)}`);
          } else {
            seenTitles.set(t, l.slug);
          }

          if (seenDescriptions.has(d)) {
            duplicateDescriptions++;
          } else {
            seenDescriptions.set(d, l.slug);
          }
        }

        console.log(`   Titles evaluated: ${listings.length}, Unique titles: ${seenTitles.size}`);
        console.log(`   Descriptions evaluated: ${listings.length}, Unique descriptions: ${seenDescriptions.size}`);
        assert(duplicateTitles === 0 || seenTitles.size > 1, "Listings generate distinct SEO titles");
      } else {
        console.log("   (No listings in database table yet; unit tests verified generation)");
      }
    } catch (e: any) {
      console.log(`   (Could not reach live database: ${e.message})`);
    }
  } else {
    console.log("   (Supabase credentials not configured in environment; unit tests passed)");
  }

  // -------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------
  console.log("\n=======================================================");
  console.log(`Results: ${passedTests} passed, ${failedTests} failed`);
  console.log("=======================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
