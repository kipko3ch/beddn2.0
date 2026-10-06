import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("placeId")?.trim();

  if (!placeId) {
    return NextResponse.json({ error: "Missing placeId" }, { status: 400 });
  }

  const googleApiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!googleApiKey) {
    return NextResponse.json({ error: "No Google Maps API key configured" }, { status: 500 });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?${new URLSearchParams({
      place_id: placeId,
      fields: "geometry,formatted_address,name,address_components",
      key: googleApiKey,
    }).toString()}`;

    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: "Could not fetch place details" }, { status: 502 });
    }

    const data = await res.json();
    if (data.status !== "OK" || !data.result) {
      return NextResponse.json({ error: data.error_message || "Place details not found" }, { status: 404 });
    }

    const result = data.result;
    const { lat, lng } = result.geometry.location;

    let country = "";
    let region = "";
    let city = "";
    let area = "";

    for (const comp of result.address_components || []) {
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

    return NextResponse.json({
      center: [Number(lng), Number(lat)] as [number, number],
      label: `${result.name ? `${result.name}, ` : ""}${result.formatted_address || ""}`,
      address: {
        country: country || "Kenya",
        city: city || region || "Nairobi",
        region: region || city || "Nairobi",
        area: area || result.name || city,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error resolving place" },
      { status: 500 }
    );
  }
}
