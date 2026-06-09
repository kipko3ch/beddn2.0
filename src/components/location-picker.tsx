"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  loadIndex,
  loadCountryFile,
  titleCase,
  type CountryMeta,
  type LocationIndex,
  type KeData,
  type TzRegionData,
} from "@/lib/locations";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface LocationPickerProps {
  latitude: number;
  longitude: number;
  /** Reports place names as the cascade is completed. */
  onPlaceChange: (place: {
    country: string;
    region: string;
    district: string;
    village: string;
  }) => void;
  /** Reports exact coordinates (geocode result or marker drag). */
  onCoordsChange: (lat: number, lng: number) => void;
  initialCountryCode?: string;
}

const selectClass =
  "h-11 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm transition focus:border-[#800020] focus:outline-none focus:ring-2 focus:ring-[#800020]/20 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60";

export function LocationPicker({
  latitude,
  longitude,
  onPlaceChange,
  onCoordsChange,
  initialCountryCode,
}: LocationPickerProps) {
  const [index, setIndex] = useState<LocationIndex | null>(null);
  const [countryCode, setCountryCode] = useState(initialCountryCode ?? "");
  const [picks, setPicks] = useState<string[]>([]);
  const [keData, setKeData] = useState<KeData | null>(null);
  const [tzRegion, setTzRegion] = useState<TzRegionData | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [manual, setManual] = useState({ region: "", district: "", area: "" });

  const [geoQuery, setGeoQuery] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [autoGeo, setAutoGeo] = useState<"idle" | "loading" | "ok" | "fail">("idle");

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  const meta: CountryMeta | undefined = index?.countries.find((c) => c.code === countryCode);

  // Load the country index once.
  useEffect(() => {
    loadIndex().then(setIndex).catch(() => setIndex({ countries: [] }));
  }, []);

  // Init map once.
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [longitude || 36.82, latitude || -1.29],
      zoom: 11,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    const marker = new maplibregl.Marker({ draggable: true, color: "#800020" })
      .setLngLat([longitude || 36.82, latitude || -1.29])
      .addTo(map);
    marker.on("dragend", () => {
      const { lat, lng } = marker.getLngLat();
      onCoordsChange(lat, lng);
    });
    map.on("click", (e) => {
      marker.setLngLat(e.lngLat);
      onCoordsChange(e.lngLat.lat, e.lngLat.lng);
    });
    mapRef.current = map;
    markerRef.current = marker;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flyTo = useCallback((lat: number, lng: number, zoom = 14) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom, essential: true });
    markerRef.current?.setLngLat([lng, lat]);
  }, []);

  // Geocode a composed place string to recentre the map.
  const geocodePlace = useCallback(
    async (query: string) => {
      if (!query.trim()) return;
      setAutoGeo("loading");
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error("not found");
        const data: { center?: [number, number] } = await res.json();
        if (!data.center) throw new Error("not found");
        const [lng, lat] = data.center;
        flyTo(lat, lng, 14);
        onCoordsChange(lat, lng);
        setAutoGeo("ok");
      } catch {
        setAutoGeo("fail");
      }
    },
    [flyTo, onCoordsChange]
  );

  // --- Options per cascade level (depends on mode + current picks) ----------
  function optionsAt(level: number): string[] {
    if (!meta) return [];
    if (meta.mode === "file" && keData) {
      if (level === 0) return keData.counties.map((c) => c.name);
      const county = keData.counties.find((c) => c.name === picks[0]);
      if (level === 1) return county?.constituencies.map((c) => c.name) ?? [];
      const cons = county?.constituencies.find((c) => c.name === picks[1]);
      if (level === 2) return cons?.wards ?? [];
    }
    if (meta.mode === "region-files") {
      if (level === 0) return meta.regions?.map((r) => r.name) ?? [];
      if (!tzRegion) return [];
      const district = tzRegion.districts.find((d) => d.name === picks[1]);
      if (level === 1) return tzRegion.districts.map((d) => d.name);
      if (level === 2) return district?.wards.map((w) => w.name) ?? [];
      const ward = district?.wards.find((w) => w.name === picks[2]);
      if (level === 3) return ward?.streets ?? [];
    }
    return [];
  }

  function reportPlace(nextPicks: string[]) {
    const countryName = meta?.name ?? "";
    let region = "",
      district = "",
      village = "";
    if (meta?.mode === "file") {
      region = nextPicks[0] ?? "";
      district = nextPicks[1] ?? "";
      village = nextPicks[2] ?? "";
    } else if (meta?.mode === "region-files") {
      region = nextPicks[0] ?? "";
      district = nextPicks[1] ?? "";
      village = nextPicks[3] || nextPicks[2] || "";
    }
    onPlaceChange({
      country: countryName,
      region: titleCase(region),
      district: titleCase(district),
      village: titleCase(village),
    });
    // Geocode the most specific composed string available.
    const parts = [village, district, region, countryName].filter(Boolean);
    if (parts.length >= 2) geocodePlace(parts.join(", "));
  }

  async function changeCountry(code: string) {
    setCountryCode(code);
    setPicks([]);
    setKeData(null);
    setTzRegion(null);
    setManual({ region: "", district: "", area: "" });
    setAutoGeo("idle");
    const m = index?.countries.find((c) => c.code === code);
    onPlaceChange({ country: m?.name ?? "", region: "", district: "", village: "" });
    if (m?.mode === "file" && m.file) {
      setLoadingData(true);
      try {
        setKeData(await loadCountryFile<KeData>(m.file));
      } finally {
        setLoadingData(false);
      }
    }
  }

  async function changeLevel(level: number, value: string) {
    const next = picks.slice(0, level);
    next[level] = value;
    setPicks(next);

    // Tanzania: selecting the region loads that region's file.
    if (meta?.mode === "region-files" && level === 0) {
      setTzRegion(null);
      const file = meta.regions?.find((r) => r.name === value)?.file;
      if (file) {
        setLoadingData(true);
        try {
          setTzRegion(await loadCountryFile<TzRegionData>(file));
        } finally {
          setLoadingData(false);
        }
      }
    }
    reportPlace(next);
  }

  function changeManual(field: "region" | "district" | "area", value: string) {
    const nextManual = { ...manual, [field]: value };
    setManual(nextManual);
    onPlaceChange({
      country: meta?.name ?? "",
      region: nextManual.region,
      district: nextManual.district,
      village: nextManual.area,
    });
  }

  async function searchGeocode(e: React.FormEvent) {
    e.preventDefault();
    if (!geoQuery.trim()) return;
    setGeoLoading(true);
    setGeoError("");
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(geoQuery.trim())}`);
      if (!res.ok) throw new Error("Area not found");
      const data: { center?: [number, number] } = await res.json();
      if (!data.center) throw new Error("Area not found");
      const [lng, lat] = data.center;
      flyTo(lat, lng, 15);
      onCoordsChange(lat, lng);
    } catch (err) {
      setGeoError(err instanceof Error ? err.message : "Could not find that place");
    } finally {
      setGeoLoading(false);
    }
  }

  const levels = meta?.levels ?? [];
  const isManual = meta?.mode === "manual";
  const isCascade = meta?.mode === "file" || meta?.mode === "region-files";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Country */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Country</label>
          <select
            className={selectClass}
            value={countryCode}
            onChange={(e) => changeCountry(e.target.value)}
          >
            <option value="">Select country…</option>
            {index?.countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Cascade selects (KE / TZ) */}
        {isCascade &&
          levels.map((levelLabel, i) => {
            const opts = optionsAt(i);
            const parentChosen = i === 0 ? !!countryCode : !!picks[i - 1];
            return (
              <div key={levelLabel}>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {levelLabel}
                </label>
                <select
                  className={selectClass}
                  value={picks[i] ?? ""}
                  disabled={!parentChosen || loadingData}
                  onChange={(e) => changeLevel(i, e.target.value)}
                >
                  <option value="">
                    {parentChosen ? `Select ${levelLabel.toLowerCase()}…` : "Pick the level above"}
                  </option>
                  {opts.map((o) => (
                    <option key={o} value={o}>
                      {titleCase(o)}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}

        {/* Manual entry (UG / RW) */}
        {isManual && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {levels[0] ?? "Region"}
              </label>
              <Input
                value={manual.region}
                onChange={(e) => changeManual("region", e.target.value)}
                placeholder={`Type ${(levels[0] ?? "region").toLowerCase()}`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {levels[1] ?? "District"}
              </label>
              <Input
                value={manual.district}
                onChange={(e) => changeManual("district", e.target.value)}
                placeholder={`Type ${(levels[1] ?? "district").toLowerCase()}`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {levels[2] ?? "Area"}
              </label>
              <Input
                value={manual.area}
                onChange={(e) => changeManual("area", e.target.value)}
                placeholder={`Type ${(levels[2] ?? "area").toLowerCase()}`}
              />
            </div>
          </>
        )}
      </div>

      {autoGeo === "loading" && (
        <p className="text-xs text-muted-foreground">Locating area on the map…</p>
      )}
      {autoGeo === "fail" && (
        <p className="text-xs text-amber-600">
          Couldn&apos;t auto-locate that area — drag the pin or use the search below.
        </p>
      )}

      <div ref={containerRef} className="h-72 w-full overflow-hidden rounded-xl border" />
      <p className="text-xs text-muted-foreground">
        Pick your area above, then drag the pin to the exact house/building. The map
        coordinates are saved with your listing.
      </p>

      <div className="rounded-xl border border-dashed p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          {isManual
            ? "Search your address to drop the pin:"
            : "Can't find your place in the lists? Search any address:"}
        </p>
        <form onSubmit={searchGeocode} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={geoQuery}
              onChange={(e) => setGeoQuery(e.target.value)}
              placeholder="e.g. Serena Hotel, Kampala"
              className="pl-9"
            />
          </div>
          <button
            type="submit"
            disabled={geoLoading}
            className="shrink-0 rounded-md bg-[#800020] px-4 text-sm font-semibold text-white hover:bg-[#600018] disabled:opacity-60"
          >
            {geoLoading ? "…" : "Find"}
          </button>
        </form>
        {geoError && <p className="mt-1 text-xs text-red-600">{geoError}</p>}
      </div>
    </div>
  );
}
