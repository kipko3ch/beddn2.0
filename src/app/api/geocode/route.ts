import { NextResponse } from "next/server";

type NominatimResult = {
  lat: string;
  lon: string;
  display_name?: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
      q: query,
      format: "jsonv2",
      limit: "1",
      addressdetails: "0",
    }).toString()}`,
    {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Beddn MVP local development",
      },
    }
  );

  if (!response.ok) {
    return NextResponse.json({ error: "Could not find that area" }, { status: 502 });
  }

  const results = (await response.json()) as NominatimResult[];
  const first = results[0];

  if (!first) {
    return NextResponse.json({ error: "Area not found" }, { status: 404 });
  }

  return NextResponse.json({
    center: [Number(first.lon), Number(first.lat)],
    label: first.display_name || query,
  });
}
