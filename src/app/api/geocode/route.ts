import { NextResponse } from "next/server";

type NominatimResult = {
  lat: string;
  lon: string;
  display_name?: string;
  address?: NominatimAddress;
  place_rank?: string | number;
};

type NominatimAddress = {
  country?: string;
  state?: string;
  region?: string;
  county?: string;
  city?: string;
  town?: string;
  village?: string;
  suburb?: string;
  neighbourhood?: string;
  road?: string;
};

type NominatimReverse = {
  lat: string;
  lon: string;
  display_name?: string;
  address?: NominatimAddress;
  place_rank?: string | number;
};

const NOMINATIM_HEADERS = {
  Accept: "application/json",
  "User-Agent": "Beddn MVP",
};

async function searchWithGooglePlaces(query: string, apiKey: string) {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?${new URLSearchParams({
      query,
      key: apiKey,
    }).toString()}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== "OK" || !data.results?.[0]) return null;
    const first = data.results[0];
    const { lat, lng } = first.geometry.location;

    const parts = (first.formatted_address || "").split(",").map((s: string) => s.trim());
    const country = parts.length > 0 ? parts[parts.length - 1] : "";
    const city = parts.length > 1 ? parts[parts.length - 2] : "";
    const area = first.name || (parts.length > 2 ? parts[parts.length - 3] : "");

    return {
      center: [Number(lng), Number(lat)] as [number, number],
      label: `${first.name ? `${first.name}, ` : ""}${first.formatted_address || query}`,
      isBroad: false,
      address: {
        country: country || "Kenya",
        city: city || "Nairobi",
        region: city || "Nairobi",
        area: area || first.name || "",
      },
    };
  } catch {
    return null;
  }
}

/**
 * Resolves location using Google Places / Geocoding API if an API key is configured.
 * Keeps costs at $0 under Google's $200/mo credit by only running on host landmark search.
 */
async function geocodeWithGoogle(query: string, apiKey: string) {
  // 1. Try Google Places Text Search (optimized for landmarks, malls, estates, and points of interest)
  const placeResult = await searchWithGooglePlaces(query, apiKey);
  if (placeResult) return placeResult;

  // 2. Fall back to Google Geocoding API (best for street addresses and administrative areas)
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?${new URLSearchParams({
      address: query,
      key: apiKey,
    }).toString()}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== "OK" || !data.results?.[0]) return null;
    const first = data.results[0];
    const { lat, lng } = first.geometry.location;

    let country = "";
    let region = "";
    let city = "";
    let area = "";

    for (const comp of first.address_components || []) {
      const types: string[] = comp.types || [];
      if (types.includes("country")) country = comp.long_name;
      else if (types.includes("administrative_area_level_1")) region = comp.long_name;
      else if (types.includes("locality")) city = comp.long_name;
      else if (!city && (types.includes("administrative_area_level_2") || types.includes("postal_town"))) {
        city = comp.long_name;
      } else if (types.includes("sublocality") || types.includes("sublocality_level_1") || types.includes("neighborhood")) {
        area = comp.long_name;
      } else if (!area && (types.includes("route") || types.includes("point_of_interest"))) {
        area = comp.long_name;
      }
    }

    const isBroad = Boolean(
      first.types?.some((t: string) => ["country", "administrative_area_level_1", "administrative_area_level_2"].includes(t))
    );

    return {
      center: [Number(lng), Number(lat)] as [number, number],
      label: first.formatted_address || query,
      isBroad,
      address: {
        country,
        city: city || region,
        region,
        area: area || city,
      },
    };
  } catch {
    return null;
  }
}

async function reverseGeocodeWithGoogle(lat: string, lon: string, apiKey: string) {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?${new URLSearchParams({
      latlng: `${lat},${lon}`,
      key: apiKey,
    }).toString()}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== "OK" || !data.results?.[0]) return null;
    const first = data.results[0];
    const { lat: rLat, lng: rLng } = first.geometry.location;

    let country = "";
    let region = "";
    let city = "";
    let area = "";

    for (const comp of first.address_components || []) {
      const types: string[] = comp.types || [];
      if (types.includes("country")) country = comp.long_name;
      else if (types.includes("administrative_area_level_1")) region = comp.long_name;
      else if (types.includes("locality")) city = comp.long_name;
      else if (!city && (types.includes("administrative_area_level_2") || types.includes("postal_town"))) {
        city = comp.long_name;
      } else if (types.includes("sublocality") || types.includes("sublocality_level_1") || types.includes("neighborhood")) {
        area = comp.long_name;
      } else if (!area && (types.includes("route") || types.includes("point_of_interest"))) {
        area = comp.long_name;
      }
    }

    return {
      center: [Number(rLng), Number(rLat)] as [number, number],
      label: first.formatted_address || "",
      isBroad: false,
      address: {
        country,
        city: city || region,
        region,
        area: area || city,
      },
    };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const googleApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;

  // Reverse geocode: coordinates -> place names (used by "use my location").
  if (lat && lon) {
    if (googleApiKey) {
      const googleResult = await reverseGeocodeWithGoogle(lat, lon, googleApiKey);
      if (googleResult) {
        return NextResponse.json(googleResult);
      }
    }

    // Fallback: OpenStreetMap / Nominatim
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${new URLSearchParams({
        lat,
        lon,
        format: "jsonv2",
        addressdetails: "1",
        zoom: "16",
      }).toString()}`,
      { headers: NOMINATIM_HEADERS }
    );

    if (!response.ok) {
      return NextResponse.json({ error: "Could not resolve location" }, { status: 502 });
    }

    const result = (await response.json()) as NominatimReverse;
    const a = result.address ?? {};
    const placeRank = result.place_rank !== undefined ? Number(result.place_rank) : 30;
    const isBroad = placeRank < 26;

    return NextResponse.json({
      center: [Number(result.lon ?? lon), Number(result.lat ?? lat)],
      label: result.display_name || "",
      isBroad,
      address: {
        country: a.country ?? "",
        city: a.city || a.town || a.village || a.county || "",
        region: a.state || a.region || a.county || "",
        area:
          a.suburb ||
          a.neighbourhood ||
          a.village ||
          a.town ||
          a.city ||
          a.road ||
          "",
      },
    });
  }

  // Forward geocode: query string -> coordinates (host landmark search).
  const query = searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  // If Google Maps API key is configured, query Google first for superior local accuracy
  if (googleApiKey) {
    const googleResult = await geocodeWithGoogle(query, googleApiKey);
    if (googleResult) {
      return NextResponse.json(googleResult);
    }
  } else {
    console.warn(
      "[/api/geocode] Warning: No GOOGLE_MAPS_API_KEY set in .env.local. Falling back to OpenStreetMap Nominatim."
    );
  }

  // Fallback: OpenStreetMap / Nominatim
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
      q: query,
      format: "jsonv2",
      limit: "1",
      addressdetails: "1",
    }).toString()}`,
    { headers: NOMINATIM_HEADERS }
  );

  if (!response.ok) {
    return NextResponse.json({ error: "Could not find that area" }, { status: 502 });
  }

  const results = (await response.json()) as NominatimResult[];
  const first = results[0];

  if (!first) {
    return NextResponse.json({ error: "Area not found" }, { status: 404 });
  }

  const a = first.address ?? {};
  const placeRank = first.place_rank !== undefined ? Number(first.place_rank) : 30;
  const isBroad = placeRank < 26;

  return NextResponse.json({
    center: [Number(first.lon), Number(first.lat)],
    label: first.display_name || query,
    isBroad,
    address: {
      country: a.country ?? "",
      city: a.city || a.town || a.village || a.county || "",
      region: a.state || a.region || a.county || "",
      area: a.suburb || a.neighbourhood || a.village || a.town || a.city || a.road || "",
    },
  });
}
