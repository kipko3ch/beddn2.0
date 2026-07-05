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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  // Reverse geocode: coordinates -> place names (used by "use my location").
  if (lat && lon) {
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

  // Forward geocode: query string -> coordinates.
  const query = searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

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
