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
import { Search, MapPin, Crosshair, Loader2 } from "lucide-react";
import { Icon } from "@iconify/react";

declare global {
  interface Window {
    google?: any;
  }
}

interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  center?: [number, number];
  address?: { country: string; city: string; area: string };
}

interface LocationPickerProps {
  latitude: number;
  longitude: number;
  mode?: "full" | "area" | "pin";
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
  "h-11 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm transition focus:border-crimson focus:outline-none focus:ring-2 focus:ring-crimson/20 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60";

export function LocationPicker({
  latitude,
  longitude,
  mode = "full",
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
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState("");

  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [fetchingPredictions, setFetchingPredictions] = useState(false);
  const [usingGoogleMap, setUsingGoogleMap] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const gMapRef = useRef<any>(null);
  const gMarkerRef = useRef<any>(null);

  const meta: CountryMeta | undefined = index?.countries.find((c) => c.code === countryCode);
  const showArea = mode === "full" || mode === "area";
  const showPin = mode === "full" || mode === "pin";

  // Load the country index once.
  useEffect(() => {
    loadIndex().then(setIndex).catch(() => setIndex({ countries: [] }));
  }, []);

  // Fetch Google Places predictions as the host types
  useEffect(() => {
    if (!geoQuery || geoQuery.trim().length < 2) {
      setPredictions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setFetchingPredictions(true);
      try {
        const res = await fetch(
          `/api/places/autocomplete?input=${encodeURIComponent(geoQuery.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.predictions)) {
            setPredictions(data.predictions);
            setShowPredictions(data.predictions.length > 0);
          }
        }
      } catch {
        // ignore
      } finally {
        setFetchingPredictions(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [geoQuery]);

  // Init map: tries Google Maps if NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is configured,
  // otherwise seamlessly uses MapLibre with Carto tiles.
  useEffect(() => {
    if (!showPin) return;
    if (!containerRef.current) return;

    const googleKey =
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY &&
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY !== "your-google-maps-api-key"
        ? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        : null;

    if (googleKey) {
      if (window.google?.maps) {
        initGoogleMap();
        return;
      }

      const scriptId = "google-maps-sdk-script";
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${googleKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }

      const handleLoaded = () => {
        if (window.google?.maps) {
          initGoogleMap();
        }
      };

      script.addEventListener("load", handleLoaded);

      const fallbackTimer = setTimeout(() => {
        if (!gMapRef.current && !mapRef.current && containerRef.current) {
          initMapLibre();
        }
      }, 3000);

      return () => {
        script?.removeEventListener("load", handleLoaded);
        clearTimeout(fallbackTimer);
      };
    } else {
      initMapLibre();
    }

    function initGoogleMap() {
      if (!containerRef.current || gMapRef.current) return;
      try {
        const gCenter = { lat: latitude || -1.29, lng: longitude || 36.82 };
        const gMap = new window.google.maps.Map(containerRef.current, {
          center: gCenter,
          zoom: 14,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: false,
        });

        const gMarker = new window.google.maps.Marker({
          position: gCenter,
          map: gMap,
          draggable: true,
        });

        gMarker.addListener("dragend", () => {
          const pos = gMarker.getPosition();
          if (pos) onCoordsChange(pos.lat(), pos.lng());
        });

        gMap.addListener("click", (e: any) => {
          if (e.latLng) {
            gMarker.setPosition(e.latLng);
            onCoordsChange(e.latLng.lat(), e.latLng.lng());
          }
        });

        gMapRef.current = gMap;
        gMarkerRef.current = gMarker;
        setUsingGoogleMap(true);
      } catch {
        initMapLibre();
      }
    }

    function initMapLibre() {
      if (!containerRef.current || mapRef.current) return;
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
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
      gMapRef.current = null;
      gMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPin]);

  const flyTo = useCallback((lat: number, lng: number, zoom = 15) => {
    if (gMapRef.current && gMarkerRef.current) {
      gMapRef.current.setCenter({ lat, lng });
      gMapRef.current.setZoom(zoom);
      gMarkerRef.current.setPosition({ lat, lng });
      return;
    }
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

  async function handleSelectPrediction(pred: PlacePrediction) {
    setShowPredictions(false);
    setGeoQuery(pred.mainText);
    setGeoLoading(true);
    setGeoError("");

    try {
      if (pred.center && pred.address) {
        const [lng, lat] = pred.center;
        flyTo(lat, lng, 16);
        onCoordsChange(lat, lng);
        onPlaceChange({
          country: pred.address.country || "",
          region: pred.address.city || "",
          district: "",
          village: pred.address.area || "",
        });
        return;
      }

      const res = await fetch(`/api/places/details?placeId=${encodeURIComponent(pred.placeId)}`);
      if (!res.ok) {
        await searchGeocode(pred.description);
        return;
      }
      const data = await res.json();
      if (!data.center) {
        await searchGeocode(pred.description);
        return;
      }

      const [lng, lat] = data.center;
      flyTo(lat, lng, 16);
      onCoordsChange(lat, lng);
      if (data.address) {
        onPlaceChange({
          country: data.address.country || "",
          region: data.address.city || data.address.region || "",
          district: "",
          village: data.address.area || "",
        });
      }
    } catch {
      await searchGeocode(pred.description);
    } finally {
      setGeoLoading(false);
    }
  }

  async function searchGeocode(overrideQuery?: string) {
    const q = (overrideQuery || geoQuery).trim();
    if (!q) return;
    setGeoLoading(true);
    setGeoError("");
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Area not found. Try entering your neighborhood or dragging the red pin.");
      }
      const data: {
        center?: [number, number];
        address?: { country?: string; region?: string; area?: string };
      } = await res.json();
      if (!data.center) throw new Error("Area not found. Try dragging the red pin.");
      const [lng, lat] = data.center;
      flyTo(lat, lng, 15);
      onCoordsChange(lat, lng);
      // Fill the area names too, so the step is complete from a landmark alone.
      if (data.address) {
        onPlaceChange({
          country: data.address.country ?? "",
          region: data.address.region ?? "",
          district: "",
          village: data.address.area ?? "",
        });
      }
    } catch (err) {
      setGeoError(err instanceof Error ? err.message : "Could not find that place");
    } finally {
      setGeoLoading(false);
    }
  }

  // Use the device's GPS to drop the pin and auto-fill the place names.
  function useMyLocation() {
    setLocateError("");
    if (!navigator.geolocation) {
      setLocateError("Your browser can't share location. Search the address instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        flyTo(lat, lng, 16);
        onCoordsChange(lat, lng);
        // Reverse-geocode so the country/region/area fields fill themselves.
        try {
          const res = await fetch(`/api/geocode?lat=${lat}&lon=${lng}`);
          if (res.ok) {
            const data: {
              address?: { country?: string; region?: string; area?: string };
            } = await res.json();
            const a = data.address;
            if (a) {
              onPlaceChange({
                country: a.country ?? "",
                region: a.region ?? "",
                district: "",
                village: a.area ?? "",
              });
            }
          }
        } catch {
          // Pin is already placed; names can be typed manually.
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setLocateError(
          "Couldn't get your location. Allow location access, or search the address below."
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const levels = meta?.levels ?? [];
  const isManual = meta?.mode === "manual";
  const isCascade = meta?.mode === "file" || meta?.mode === "region-files";

  return (
    <div className="flex flex-col gap-5">
      {/* Reassurance — most homes here aren't on a street map. */}
      <div className="order-1 rounded-xl bg-[#fbf7f8] p-4">
        <p className="text-sm font-semibold text-[#2b000a]">No street address? That&apos;s fine.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {showArea && !showPin
            ? "Guests see the area and nearby place name first, not your exact address. Pick the public location details they can recognize."
            : "Guests find places by landmarks, not house numbers. Use GPS, a nearby landmark, or the map to place the pin near your gate."}
        </p>
      </div>

      {/* Two primary ways to locate — GPS, or a nearby landmark search. */}
      {showPin && (
      <div className="order-3 grid gap-3 sm:grid-cols-2">
        {/* Option 1: GPS */}
        <div className="flex flex-col rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#181113]">
            <span className="flex size-7 items-center justify-center rounded-full bg-[#f0d9e0] text-crimson">
              <Crosshair className="h-4 w-4" />
            </span>
            At the place now?
          </div>
          <p className="mt-2 flex-1 text-xs text-muted-foreground">
            Use your phone&apos;s GPS to place the pin near your gate or building.
          </p>
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="mt-3 inline-flex items-center justify-center gap-2 rounded-full bg-[#800020] px-4 py-2 text-sm font-semibold text-white hover:bg-merlot disabled:opacity-60"
          >
            <MapPin className="h-4 w-4" />
            {locating ? "Locating…" : "Use my location"}
          </button>
          {locateError && <p className="mt-2 text-xs text-amber-600">{locateError}</p>}
        </div>

        {/* Option 2: Landmark search with Google Places Autocomplete */}
        <div className="relative flex flex-col rounded-xl border p-4">
          <div className="flex items-center justify-between text-sm font-semibold text-[#181113]">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-[#f0d9e0] text-crimson">
                <Search className="h-4 w-4" />
              </span>
              Search a landmark nearby
            </div>
            <span className="text-[11px] font-normal text-stone-500 flex items-center gap-1">
              <Icon icon="logos:google-icon" className="size-3" /> Places search
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            A mall, school, church, market, petrol station or estate close to you.
          </p>

          <div className="relative mt-3 flex gap-2">
            <div className="relative flex-1">
              <Input
                value={geoQuery}
                onChange={(e) => {
                  setGeoQuery(e.target.value);
                  setShowPredictions(true);
                }}
                onFocus={() => {
                  if (predictions.length > 0) setShowPredictions(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowPredictions(false);
                    searchGeocode();
                  }
                }}
                placeholder="e.g. Naivas Kilimani, Sarit Centre, Acacia Mall"
                className="w-full pr-8"
              />
              {fetchingPredictions && (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <Loader2 className="size-3.5 animate-spin text-stone-400" />
                </div>
              )}

              {/* Live Google Places Autocomplete Dropdown */}
              {showPredictions && predictions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-xl divide-y">
                  {predictions.map((p) => (
                    <button
                      key={p.placeId}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectPrediction(p);
                      }}
                      className="w-full flex items-start gap-2.5 p-2.5 text-left hover:bg-stone-50 transition-colors"
                    >
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-[#800020] mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-stone-900 truncate">
                          {p.mainText}
                        </p>
                        {p.secondaryText && (
                          <p className="text-[11px] text-stone-500 truncate">
                            {p.secondaryText}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                  <div className="px-3 py-1.5 bg-stone-50 text-[10px] text-stone-400 font-medium flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Icon icon="logos:google-icon" className="size-2.5" /> Powered by Google Places
                    </span>
                    <span>Tap to pin location</span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setShowPredictions(false);
                searchGeocode();
              }}
              disabled={geoLoading}
              className="shrink-0 rounded-md bg-cranberry px-4 text-sm font-semibold text-white hover:bg-merlot disabled:opacity-60"
            >
              {geoLoading ? "…" : "Find"}
            </button>
          </div>
          {geoError && <p className="mt-2 text-xs text-red-600">{geoError}</p>}
        </div>
      </div>
      )}

      {/* Map */}
      {showPin && (
      <div className="order-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-stone-500 pb-0.5">
          <span className="font-semibold text-stone-700 flex items-center gap-1.5">
            {usingGoogleMap ? (
              <>
                <Icon icon="logos:google-maps" className="size-3.5" />
                <span>Google Map Pin Locator</span>
              </>
            ) : (
              <span>Map Pin Locator</span>
            )}
          </span>
          <span className="text-[11px] text-stone-400">
            {usingGoogleMap ? "Map & Satellite view available" : "Drag the pin or tap to position"}
          </span>
        </div>
        <div ref={containerRef} className="h-80 w-full overflow-hidden rounded-xl border shadow-inner" />
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-crimson" />
          <span>
            Drag the pin to your exact gate or building — or tap the map to move it.
            This is what guests use to navigate, so accuracy here matters more than the
            address.
          </span>
        </p>
        {autoGeo === "loading" && (
          <p className="text-xs text-muted-foreground">Locating on the map…</p>
        )}
        {autoGeo === "fail" && (
          <p className="text-xs text-amber-600">
            Couldn&apos;t auto-locate that — drag the pin or search a landmark above.
          </p>
        )}
      </div>
      )}

      {/* Area names — auto-filled from GPS/search, editable. Shown to guests. */}
      {showArea && (
      <div className="order-2 rounded-xl border bg-white p-4">
        <p className="text-sm font-semibold text-[#181113]">Area details guests will see</p>
        <p className="mb-3 text-xs text-muted-foreground">
          These fill in automatically — adjust them if needed. Guests see the area, not
          your exact address.
        </p>
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
      </div>
      )}
    </div>
  );
}
