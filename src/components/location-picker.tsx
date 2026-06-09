"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  COUNTRIES,
  getRegions,
  getDistricts,
  getVillages,
  findVillage,
} from "@/lib/locations";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export interface ResolvedLocation {
  countryName: string;
  region: string;
  district: string;
  village: string;
  latitude: number;
  longitude: number;
}

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
  /** Reports exact coordinates (village select, map click, or marker drag). */
  onCoordsChange: (lat: number, lng: number) => void;
  /** Optional initial selection (edit mode). */
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
  const [countryCode, setCountryCode] = useState(initialCountryCode ?? "");
  const [region, setRegion] = useState("");
  const [district, setDistrict] = useState("");
  const [village, setVillage] = useState("");

  const [geoQuery, setGeoQuery] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  const country = COUNTRIES.find((c) => c.code === countryCode);
  const regions = countryCode ? getRegions(countryCode) : [];
  const districts = countryCode && region ? getDistricts(countryCode, region) : [];
  const villages =
    countryCode && region && district
      ? getVillages(countryCode, region, district)
      : [];

  // Initialise the map once.
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [longitude || 36.82, latitude || -1.29],
      zoom: 12,
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

  function flyTo(lat: number, lng: number, zoom: number) {
    mapRef.current?.flyTo({ center: [lng, lat], zoom, essential: true });
    markerRef.current?.setLngLat([lng, lat]);
  }

  // --- Reactive cascade: each parent change clears and rebuilds children ----
  function changeCountry(code: string) {
    setCountryCode(code);
    setRegion("");
    setDistrict("");
    setVillage("");
    onPlaceChange({
      country: COUNTRIES.find((c) => c.code === code)?.name ?? "",
      region: "",
      district: "",
      village: "",
    });
  }

  function changeRegion(name: string) {
    setRegion(name);
    setDistrict("");
    setVillage("");
    onPlaceChange({ country: country?.name ?? "", region: name, district: "", village: "" });
  }

  function changeDistrict(name: string) {
    setDistrict(name);
    setVillage("");
    onPlaceChange({
      country: country?.name ?? "",
      region,
      district: name,
      village: "",
    });
  }

  function changeVillage(name: string) {
    setVillage(name);
    onPlaceChange({ country: country?.name ?? "", region, district, village: name });
    const v = findVillage(countryCode, region, district, name);
    if (v) {
      flyTo(v.lat, v.lng, v.zoom);
      onCoordsChange(v.lat, v.lng);
    }
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
      flyTo(lat, lng, 14);
      onCoordsChange(lat, lng);
    } catch (err) {
      setGeoError(err instanceof Error ? err.message : "Could not find that place");
    } finally {
      setGeoLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Country
          </label>
          <select
            className={selectClass}
            value={countryCode}
            onChange={(e) => changeCountry(e.target.value)}
          >
            <option value="">Select country…</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Region / County
          </label>
          <select
            className={selectClass}
            value={region}
            disabled={!countryCode}
            onChange={(e) => changeRegion(e.target.value)}
          >
            <option value="">{countryCode ? "Select region…" : "Pick a country first"}</option>
            {regions.map((r) => (
              <option key={r.name} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            District / Sub-county
          </label>
          <select
            className={selectClass}
            value={district}
            disabled={!region}
            onChange={(e) => changeDistrict(e.target.value)}
          >
            <option value="">{region ? "Select district…" : "Pick a region first"}</option>
            {districts.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Village / Estate / Area
          </label>
          <select
            className={selectClass}
            value={village}
            disabled={!district}
            onChange={(e) => changeVillage(e.target.value)}
          >
            <option value="">{district ? "Select area…" : "Pick a district first"}</option>
            {villages.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div ref={containerRef} className="h-72 w-full overflow-hidden rounded-xl border" />
      <p className="text-xs text-muted-foreground">
        Pick your area above, then drag the pin to the exact house/building. The map
        coordinates are saved with your listing.
      </p>

      <div className="rounded-xl border border-dashed p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Can&apos;t find your place in the lists? Search any address:
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
