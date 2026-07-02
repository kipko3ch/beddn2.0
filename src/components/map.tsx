"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Listing } from "@/lib/types";

// Google-Maps-default look: CARTO "voyager" vector style — colored roads,
// green parks, blue water, and POI labels (close to maps.google.com default).
const MAP_STYLE = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

interface MapProps {
  listings: Listing[];
  center?: [number, number];
  zoom?: number;
  highlightedId?: string | null;
  onPinClick?: (listing: Listing) => void;
  className?: string;
  approximate?: boolean;
  priceMode?: "hourly" | "overnight" | "experience";
  /** When false the map is a static image: no pan/zoom/rotate and no controls. */
  interactive?: boolean;
}

export function Map({
  listings,
  center = [36.82, -1.29],
  zoom = 12,
  highlightedId,
  onPinClick,
  className = "w-full h-full",
  approximate = false,
  priceMode = "hourly",
  interactive = true,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef(new globalThis.Map<string, maplibregl.Marker>());

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center,
      zoom,
      interactive,
      // Imagery requires attribution — keep it but compact (Google does too).
      attributionControl: { compact: true },
    });

    if (interactive) {
      map.addControl(new maplibregl.NavigationControl(), "top-right");
    } else {
      // Static map: lock every interaction so it can't be panned or jittered.
      map.dragPan.disable();
      map.scrollZoom.disable();
      map.boxZoom.disable();
      map.dragRotate.disable();
      map.keyboard.disable();
      map.doubleClickZoom.disable();
      map.touchZoomRotate.disable();
      map.touchPitch?.disable();
    }
    mapRef.current = map;

    return () => map.remove();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Animate only when interactive; a static map jumps straight to position.
    if (interactive) map.easeTo({ center, zoom, duration: 450 });
    else map.jumpTo({ center, zoom });
  }, [center, zoom, interactive]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    listings.forEach((listing) => {
      const lng = listing.longitude;
      const lat = listing.latitude;

      const el = document.createElement("div");

      if (approximate) {
        // Privacy mode (property page): a soft circle over the neighbourhood
        // instead of an exact pin — the precise spot unlocks after booking.
        el.style.cssText = `
          width: 110px; height: 110px; border-radius: 50%;
          background: rgba(232,84,123,0.18); border: 2px solid rgba(232,84,123,0.45);
          display: flex; align-items: center; justify-content: center;
        `;
        const dot = document.createElement("div");
        dot.style.cssText =
          "width: 14px; height: 14px; border-radius: 50%; background: #e8547b; border: 3px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.3);";
        el.appendChild(dot);
      } else {
        const price =
          priceMode === "overnight" && listing.overnight_price
            ? listing.overnight_price
            : priceMode === "experience" && listing.experience_price
            ? listing.experience_price
            : priceMode === "hourly" && listing.hourly_price
            ? listing.hourly_price
            : listing.hourly_price ?? listing.overnight_price ?? listing.experience_price ?? 0;
        const active = listing.id === highlightedId;
        el.className = "map-price-pin";
        el.textContent = `${listing.currency || "KES"} ${Number(price).toLocaleString()}`;
        el.style.cssText = `
          background: ${active ? "#800020" : "#fff"};
          border: 1px solid ${active ? "#800020" : "rgba(24,17,19,0.16)"};
          border-radius: 999px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.18);
          color: ${active ? "#fff" : "#181113"};
          cursor: pointer;
          font-size: 12px;
          font-weight: 800;
          line-height: 1;
          padding: 8px 11px;
          white-space: nowrap;
          transform: ${active ? "scale(1.12)" : "scale(1)"};
          transition: transform 0.15s, background 0.15s, border-color 0.15s, box-shadow 0.15s;
          z-index: ${active ? 10 : 1};
        `;
        el.addEventListener("click", () => onPinClick?.(listing));
      }

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);

      markersRef.current.set(listing.id, marker);
    });

    if (listings.length > 1 && !highlightedId && !approximate) {
      const bounds = new maplibregl.LngLatBounds();
      listings.forEach((l) => bounds.extend([l.longitude, l.latitude]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
    }
  }, [listings, highlightedId, approximate, onPinClick, priceMode]);

  return <div ref={containerRef} className={className} />;
}
