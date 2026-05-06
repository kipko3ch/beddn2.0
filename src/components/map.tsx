"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Listing } from "@/lib/types";

interface MapProps {
  listings: Listing[];
  center?: [number, number];
  zoom?: number;
  highlightedId?: string | null;
  onPinClick?: (listing: Listing) => void;
  className?: string;
  approximate?: boolean;
}

export function Map({
  listings,
  center = [36.82, -1.29],
  zoom = 12,
  highlightedId,
  onPinClick,
  className = "w-full h-full",
  approximate = false,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef(new globalThis.Map<string, maplibregl.Marker>());

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center,
      zoom,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    return () => map.remove();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    listings.forEach((listing) => {
      let lng = listing.longitude;
      let lat = listing.latitude;

      if (approximate) {
        lng += (Math.random() - 0.5) * 0.005;
        lat += (Math.random() - 0.5) * 0.005;
      }

      const price =
        listing.hourly_price ??
        listing.overnight_price ??
        listing.experience_price ??
        0;

      const el = document.createElement("div");
      el.className = "map-price-pin";
      el.textContent = `$${Number(price).toLocaleString()}`;
      el.style.cssText = `
        background: white; border: 2px solid ${listing.id === highlightedId ? "#800020" : "#333"};
        border-radius: 20px; padding: 2px 8px; font-size: 12px; font-weight: 600;
        cursor: pointer; white-space: nowrap;
        transform: ${listing.id === highlightedId ? "scale(1.15)" : "scale(1)"};
        transition: transform 0.15s, border-color 0.15s;
        z-index: ${listing.id === highlightedId ? 10 : 1};
      `;

      el.addEventListener("click", () => onPinClick?.(listing));

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);

      markersRef.current.set(listing.id, marker);
    });

    if (listings.length > 0 && !highlightedId) {
      const bounds = new maplibregl.LngLatBounds();
      listings.forEach((l) => bounds.extend([l.longitude, l.latitude]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
    }
  }, [listings, highlightedId, approximate]);

  return <div ref={containerRef} className={className} />;
}
