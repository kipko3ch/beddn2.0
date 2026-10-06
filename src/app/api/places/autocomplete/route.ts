import { NextResponse } from "next/server";

const NOMINATIM_HEADERS = {
  Accept: "application/json",
  "User-Agent": "Beddn MVP",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get("input")?.trim();

  if (!input || input.length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  const googleApiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (googleApiKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${new URLSearchParams({
        input,
        components: "country:ke|country:tz",
        key: googleApiKey,
      }).toString()}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.status === "OK" && Array.isArray(data.predictions)) {
          const predictions = data.predictions.map((p: any) => ({
            placeId: p.place_id,
            description: p.description,
            mainText: p.structured_formatting?.main_text || p.description,
            secondaryText: p.structured_formatting?.secondary_text || "",
          }));
          return NextResponse.json({ predictions, provider: "google" });
        }
      }
    } catch {
      // Fall through to Nominatim fallback
    }
  }

  // Fallback: OpenStreetMap search
  try {
    const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
      q: input,
      countrycodes: "ke,tz",
      format: "jsonv2",
      limit: "5",
      addressdetails: "1",
    }).toString()}`;

    const res = await fetch(url, { headers: NOMINATIM_HEADERS });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const predictions = data.map((item: any, idx: number) => ({
          placeId: `osm_${item.osm_id || idx}`,
          description: item.display_name,
          mainText: item.name || item.display_name?.split(",")?.[0] || input,
          secondaryText: item.display_name?.split(",")?.slice(1)?.join(",")?.trim() || "",
          center: [Number(item.lon), Number(item.lat)],
          address: {
            country: item.address?.country || "",
            city: item.address?.city || item.address?.town || item.address?.county || "",
            area: item.address?.suburb || item.address?.neighbourhood || item.address?.road || "",
          },
        }));
        return NextResponse.json({ predictions, provider: "osm" });
      }
    }
  } catch {
    // ignore
  }

  return NextResponse.json({ predictions: [] });
}
