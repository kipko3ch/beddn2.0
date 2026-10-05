import type { Metadata } from "next";
import type { Listing, Review } from "@/lib/types";
import { PROPERTY_TYPE_LABEL } from "@/lib/property-types";
import { AMENITY_LABEL } from "@/lib/amenities";

export const SITE_URL = "https://beddn.com";
export const DEFAULT_SITE_TITLE = "Beddn | Book Short Stays & BnBs in Kenya and Tanzania";
export const DEFAULT_SITE_DESCRIPTION =
  "Find and book short stays, BnBs and furnished apartments across Kenya and Tanzania. Hosts, list your place on Beddn and start earning.";

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

/**
 * Extracts bedroom count from fields, title, name, slug, or description.
 */
export function extractBedrooms(listing: Partial<Listing>): number | null {
  if (typeof (listing as Record<string, unknown>).bedrooms === "number") {
    const b = (listing as Record<string, unknown>).bedrooms as number;
    if (b > 0) return b;
  }
  if (typeof (listing as Record<string, unknown>).bedroom_count === "number") {
    const b = (listing as Record<string, unknown>).bedroom_count as number;
    if (b > 0) return b;
  }

  const textSources = [
    listing.title ?? "",
    listing.name ?? "",
    listing.slug ? listing.slug.replace(/[-_]/g, " ") : "",
    listing.description ?? "",
  ];

  for (const text of textSources) {
    if (!text) continue;

    // Pattern 1: "2 bedroom", "2-bedroom", "2 bed", "2 beds", "2 bdrm"
    const digitMatch = text.match(/(?:^|\b)(\d+)\s*(?:-| )?\s*(?:bed(?:room)?|bdrm|beds)\b/i);
    if (digitMatch && digitMatch[1]) {
      const count = parseInt(digitMatch[1], 10);
      if (count > 0 && count < 20) return count;
    }

    // Pattern 2: "two bedroom", "three bed"
    const wordMatch = text.match(
      /(?:^|\b)(one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:-| )?\s*(?:bed(?:room)?|bdrm|beds)\b/i
    );
    if (wordMatch && wordMatch[1]) {
      const count = NUMBER_WORDS[wordMatch[1].toLowerCase()];
      if (count) return count;
    }
  }

  return null;
}

/**
 * Extracts bathroom info from fields, title, description, or amenities.
 */
export function extractBathrooms(listing: Partial<Listing>): string | null {
  if (typeof (listing as Record<string, unknown>).bathrooms === "number") {
    const b = (listing as Record<string, unknown>).bathrooms as number;
    return `${b} ${b === 1 ? "bath" : "baths"}`;
  }

  const textSources = [listing.title ?? "", listing.name ?? "", listing.description ?? ""];
  for (const text of textSources) {
    if (!text) continue;
    const match = text.match(/(?:^|\b)(\d+(?:\.\d+)?)\s*(?:-| )?\s*(?:bath(?:room)?|baths)\b/i);
    if (match && match[1]) {
      const count = parseFloat(match[1]);
      return `${count} ${count === 1 ? "bath" : "baths"}`;
    }
  }

  const amenities = (listing.amenities ?? []).map((a) => a.toLowerCase());
  if (amenities.includes("private_bathroom")) return "private bath";
  if (amenities.includes("shared_bathroom")) return "shared bath";

  return null;
}

/**
 * Resolves the display property type (e.g., "Apartment", "House", "Villa").
 */
export function extractPropertyType(listing: Partial<Listing>): string {
  if (listing.property_type && PROPERTY_TYPE_LABEL[listing.property_type]) {
    return PROPERTY_TYPE_LABEL[listing.property_type];
  }

  // Fallbacks: detect common space types in title or name
  const combined = `${listing.title || ""} ${listing.name || ""}`.toLowerCase();
  const knownTypes = [
    "Apartment",
    "Penthouse",
    "Villa",
    "House",
    "Bungalow",
    "Maisonette",
    "Townhouse",
    "Studio",
    "Cottage",
    "Cabin",
    "Suite",
    "Guesthouse",
    "Resort",
  ];

  for (const t of knownTypes) {
    if (combined.includes(t.toLowerCase())) {
      return t;
    }
  }

  return "Stay";
}

/**
 * Checks whether both hourly and overnight categories/pricing are offered.
 */
export function offersBothHourlyAndOvernight(listing: Partial<Listing>): boolean {
  const cats = ((listing.categories || listing.category || []) as string[]).map((c) =>
    c.toLowerCase()
  );

  const hasHourly =
    cats.includes("hourly") || (listing.hourly_price != null && Number(listing.hourly_price) > 0);
  const hasOvernight =
    cats.includes("overnight") ||
    (listing.overnight_price != null && Number(listing.overnight_price) > 0);

  return Boolean(hasHourly && hasOvernight);
}

/**
 * Cleans and formats location parts: neighborhood (area) and city.
 * Never prints undefined, trailing commas, or duplicated values.
 */
export function formatLocation(listing: Partial<Listing>): {
  neighborhood: string;
  city: string;
  combined: string;
} {
  const neighborhood = (listing.area || "").trim();
  const city = (listing.city || "").trim();

  let combined = "";
  if (neighborhood && city) {
    if (neighborhood.toLowerCase() === city.toLowerCase()) {
      combined = city;
    } else {
      combined = `${neighborhood}, ${city}`;
    }
  } else if (neighborhood) {
    combined = neighborhood;
  } else if (city) {
    combined = city;
  }

  return { neighborhood, city, combined };
}

/**
 * Formats listing title strictly under 60 characters:
 * "{bedrooms} Bedroom {type} in {neighborhood}, {city} | {Hourly & Overnight Stays if both offered}"
 * Drops or truncates the least important parts first to fit <= 60 chars.
 */
export function formatListingTitle(listing: Partial<Listing>): string {
  const bedrooms = extractBedrooms(listing);
  const propertyType = extractPropertyType(listing);
  const { city, combined: location } = formatLocation(listing);
  const isBoth = offersBothHourlyAndOvernight(listing);

  // Core lead: e.g. "2 Bedroom House" or "House" or "Studio"
  let lead = "";
  if (propertyType.toLowerCase() === "studio") {
    lead = "Studio";
  } else if (bedrooms) {
    lead = `${bedrooms} Bedroom ${propertyType}`.trim();
  } else {
    lead = propertyType;
  }

  // Fallback if lead is too generic or empty
  if (!lead || lead === "Stay") {
    const rawName = (listing.title || listing.name || "").trim();
    if (rawName && rawName.length <= 35) {
      lead = rawName;
    } else {
      lead = "Stay";
    }
  }

  const bothSuffixLong = " | Hourly & Overnight Stays";
  const bothSuffixShort = " | Hourly & Overnight";

  // Build candidate combinations in descending priority
  // Level 1: Full title with location and long suffix
  if (isBoth) {
    if (location) {
      const fullLong = `${lead} in ${location}${bothSuffixLong}`;
      if (fullLong.length <= 60) return fullLong;

      const fullShort = `${lead} in ${location}${bothSuffixShort}`;
      if (fullShort.length <= 60) return fullShort;
    }

    // Try with just city + long/short suffix
    if (city && city !== location) {
      const cityLong = `${lead} in ${city}${bothSuffixLong}`;
      if (cityLong.length <= 60) return cityLong;

      const cityShort = `${lead} in ${city}${bothSuffixShort}`;
      if (cityShort.length <= 60) return cityShort;
    }
  }

  // Level 2: Lead + full location (no suffix)
  if (location) {
    const withLocation = `${lead} in ${location}`;
    if (withLocation.length <= 60) return withLocation;
  }

  // Level 3: Lead + city only
  if (city) {
    const withCity = `${lead} in ${city}`;
    if (withCity.length <= 60) return withCity;
  }

  // Level 4: Truncate lead if extraordinarily long, guarantee <= 60
  if (location) {
    const maxLeadLen = 60 - ` in ${location}`.length;
    if (maxLeadLen > 10) {
      return `${lead.slice(0, maxLeadLen).trim()} in ${location}`;
    }
  }

  return lead.length <= 60 ? lead : lead.slice(0, 60).trim();
}

/**
 * Top amenities mapped to human-friendly phrases.
 */
const AMENITY_DESCRIPTIONS: Record<string, string> = {
  wifi: "fast WiFi",
  free_wifi: "fast WiFi",
  pool: "swimming pool",
  swimming_pool: "swimming pool",
  parking: "free parking",
  free_parking: "free parking",
  kitchen: "equipped kitchen",
  kitchenette: "kitchenette",
  hot_water: "hot water",
  hot_shower: "hot shower",
  air_conditioning: "air conditioning",
  ac: "air conditioning",
  backup_generator: "backup generator",
  solar_power: "solar power",
  security: "24/7 security",
  balcony: "private balcony",
  tv: "smart TV",
  gym: "gym",
  washing_machine: "washer",
  private_bathroom: "private bath",
};

/**
 * Formats listing description between 140-160 characters:
 * "{short natural summary: bedrooms, bathrooms, furnished, top 2-3 amenities} in {neighborhood}, {city}. From {currency} {price}/night or {hourly price}/hr. Book on Beddn."
 */
export function formatListingDescription(listing: Partial<Listing>): string {
  const bedrooms = extractBedrooms(listing);
  const bathrooms = extractBathrooms(listing);
  const propertyType = extractPropertyType(listing).toLowerCase();
  const { combined: location } = formatLocation(listing);

  // Check if furnished
  const amenitiesList = (listing.amenities || []).map((a) => a.toLowerCase());
  const textBlob = `${listing.title || ""} ${listing.name || ""} ${listing.description || ""}`.toLowerCase();
  const isFurnished =
    textBlob.includes("furnished") ||
    amenitiesList.some((a) => a.includes("furnished") || a === "bed_linen");

  // Pick top 2-3 distinct amenities
  const highlightedAmenities: string[] = [];
  for (const [key, label] of Object.entries(AMENITY_DESCRIPTIONS)) {
    if (
      amenitiesList.includes(key) ||
      amenitiesList.some((a) => a.includes(key)) ||
      textBlob.includes(key)
    ) {
      if (!highlightedAmenities.includes(label)) {
        highlightedAmenities.push(label);
      }
    }
    if (highlightedAmenities.length >= 3) break;
  }

  // Build natural summary lead
  let summaryLead = "";
  if (propertyType === "studio") {
    summaryLead = isFurnished ? "Furnished studio" : "Studio";
  } else if (bedrooms) {
    const furnPrefix = isFurnished ? "Furnished " : "";
    summaryLead = `${furnPrefix}${bedrooms}-bedroom ${propertyType}`.trim();
  } else {
    summaryLead = isFurnished ? `Furnished ${propertyType}` : `${propertyType}`;
    // Capitalize first letter
    summaryLead = summaryLead.charAt(0).toUpperCase() + summaryLead.slice(1);
  }

  // Feature clauses: bathrooms + amenities
  const features: string[] = [];
  if (bathrooms) {
    features.push(bathrooms);
  }
  features.push(...highlightedAmenities);

  // Location clause
  const locationClause = location ? ` in ${location}` : "";

  // Pricing clause
  const currency = listing.currency || "KES";
  const overnightPrice =
    listing.overnight_price != null && Number(listing.overnight_price) > 0
      ? Number(listing.overnight_price)
      : null;
  const hourlyPrice =
    listing.hourly_price != null && Number(listing.hourly_price) > 0
      ? Number(listing.hourly_price)
      : null;

  let priceClause = "";
  if (overnightPrice && hourlyPrice) {
    priceClause = ` From ${currency} ${overnightPrice.toLocaleString()}/night or ${hourlyPrice.toLocaleString()}/hr.`;
  } else if (overnightPrice) {
    priceClause = ` From ${currency} ${overnightPrice.toLocaleString()}/night.`;
  } else if (hourlyPrice) {
    priceClause = ` From ${currency} ${hourlyPrice.toLocaleString()}/hr.`;
  } else if (listing.experience_price) {
    priceClause = ` From ${currency} ${Number(listing.experience_price).toLocaleString()}.`;
  }

  // Generate candidates with varying feature count and CTA to land in 140-160 range
  const ctaOptions = [
    " Book on Beddn.",
    " Book your stay on Beddn.",
    " Reserve your stay on Beddn.",
    " Reserve your stay today on Beddn.",
    " Reserve your hourly or overnight stay on Beddn.",
  ];

  // Try combining feature sets (3 features, 2 features, 1 feature, 0 features) with CTAs
  let bestCandidate = "";

  for (let fCount = Math.min(features.length, 3); fCount >= 0; fCount--) {
    const chosenFeatures = features.slice(0, fCount);
    let withClause = "";
    if (chosenFeatures.length === 1) {
      withClause = ` with ${chosenFeatures[0]}`;
    } else if (chosenFeatures.length === 2) {
      withClause = ` with ${chosenFeatures[0]} and ${chosenFeatures[1]}`;
    } else if (chosenFeatures.length > 2) {
      withClause = ` with ${chosenFeatures.slice(0, -1).join(", ")} & ${chosenFeatures[chosenFeatures.length - 1]}`;
    }

    const base = `${summaryLead}${withClause}${locationClause}.${priceClause}`;

    for (const cta of ctaOptions) {
      const candidate = `${base}${cta}`.replace(/\s+/g, " ").trim();
      if (candidate.length >= 140 && candidate.length <= 160) {
        return candidate;
      }
      // Track candidate that is closest to 140-160
      if (!bestCandidate) {
        bestCandidate = candidate;
      } else {
        const bestDiff =
          bestCandidate.length < 140
            ? 140 - bestCandidate.length
            : bestCandidate.length > 160
            ? bestCandidate.length - 160
            : 0;
        const curDiff =
          candidate.length < 140
            ? 140 - candidate.length
            : candidate.length > 160
            ? candidate.length - 160
            : 0;
        if (curDiff < bestDiff) {
          bestCandidate = candidate;
        }
      }
    }
  }

  // If candidate exceeds 160 chars, trim cleanly
  if (bestCandidate.length > 160) {
    const trimmed = bestCandidate.slice(0, 156);
    const lastSpace = trimmed.lastIndexOf(" ");
    return `${trimmed.slice(0, lastSpace)}.`;
  }

  return bestCandidate;
}

/**
 * Builds standard OpenGraph and Twitter card metadata for a listing.
 */
export function buildListingMetadata(listing: Listing): Metadata {
  const title = formatListingTitle(listing);
  const description = formatListingDescription(listing);
  const canonicalUrl = `${SITE_URL}/property/${listing.slug}`;

  // Image: first listing photo
  const rawImage = listing.listing_images?.[0]?.url;
  const imageUrl = rawImage
    ? rawImage.startsWith("http")
      ? rawImage
      : `${SITE_URL}${rawImage}`
    : `${SITE_URL}/images/cat-all.png`;

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
      locale: "en_KE",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: listing.title || listing.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

/**
 * Generates Schema.org JSON-LD data for the listing page:
 * - LodgingBusiness schema
 * - BreadcrumbList schema
 * - aggregateRating ONLY when real reviews exist
 */
export function generateListingJsonLd(
  listing: Listing,
  reviews?: Review[]
): Record<string, unknown> {
  const title = listing.title || listing.name;
  const description = formatListingDescription(listing);
  const canonicalUrl = `${SITE_URL}/property/${listing.slug}`;

  const images: string[] = (listing.listing_images || [])
    .map((img) => (img.url?.startsWith("http") ? img.url : `${SITE_URL}${img.url}`))
    .filter(Boolean);

  if (images.length === 0) {
    images.push(`${SITE_URL}/images/cat-all.png`);
  }

  const bedrooms = extractBedrooms(listing);
  const amenityFeatures = (listing.amenities || []).slice(0, 20).map((a) => ({
    "@type": "LocationFeatureSpecification",
    name: AMENITY_LABEL[a] || a.replace(/_/g, " "),
    value: true,
  }));

  const currency = listing.currency || "KES";
  const overnightPrice = listing.overnight_price ? Number(listing.overnight_price) : null;
  const hourlyPrice = listing.hourly_price ? Number(listing.hourly_price) : null;

  let priceRange = `${currency} 0`;
  if (hourlyPrice && overnightPrice) {
    priceRange = `${currency} ${hourlyPrice.toLocaleString()} - ${overnightPrice.toLocaleString()}`;
  } else if (overnightPrice) {
    priceRange = `${currency} ${overnightPrice.toLocaleString()}`;
  } else if (hourlyPrice) {
    priceRange = `${currency} ${hourlyPrice.toLocaleString()}`;
  }

  const primaryPrice = overnightPrice || hourlyPrice || Number(listing.experience_price || 0);

  const realReviews = (reviews || []).filter((r) => typeof r.rating === "number" && r.rating > 0);

  const lodgingObject: Record<string, unknown> = {
    "@type": "LodgingBusiness",
    "@id": `${canonicalUrl}#lodging`,
    name: title,
    description,
    url: canonicalUrl,
    image: images,
    address: {
      "@type": "PostalAddress",
      addressLocality: listing.city || "Nairobi",
      addressRegion: listing.area || undefined,
      addressCountry: listing.country || "Kenya",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: Number(listing.latitude || 0),
      longitude: Number(listing.longitude || 0),
    },
    numberOfRooms: bedrooms || 1,
    amenityFeature: amenityFeatures,
    priceRange,
    makesOffer: {
      "@type": "Offer",
      price: primaryPrice,
      priceCurrency: currency,
      availability: "https://schema.org/InStock",
      url: canonicalUrl,
    },
  };

  // Only include aggregateRating if real reviews exist
  if (realReviews.length > 0) {
    const totalRating = realReviews.reduce((sum, r) => sum + Number(r.rating), 0);
    const avgRating = totalRating / realReviews.length;
    lodgingObject.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(avgRating.toFixed(1)),
      reviewCount: realReviews.length,
      bestRating: "5",
      worstRating: "1",
    };
  }

  const breadcrumbs = {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: listing.country || "East Africa",
        item: `${SITE_URL}/search?q=${encodeURIComponent(listing.country || "")}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: listing.city || "Stays",
        item: `${SITE_URL}/search?q=${encodeURIComponent(listing.city || "")}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: title,
        item: canonicalUrl,
      },
    ],
  };

  return {
    "@context": "https://schema.org",
    "@graph": [lodgingObject, breadcrumbs],
  };
}
