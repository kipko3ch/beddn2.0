"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface MapPinPickerProps {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
}

export function MapPinPicker({ latitude, longitude, onChange }: MapPinPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [longitude || 36.82, latitude || -1.29],
      zoom: 13,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    const marker = new maplibregl.Marker({ draggable: true })
      .setLngLat([longitude || 36.82, latitude || -1.29])
      .addTo(map);

    marker.on("dragend", () => {
      const lngLat = marker.getLngLat();
      onChange(lngLat.lat, lngLat.lng);
    });

    map.on("click", (e) => {
      marker.setLngLat(e.lngLat);
      onChange(e.lngLat.lat, e.lngLat.lng);
    });

    markerRef.current = marker;

    return () => map.remove();
  }, []);

  return (
    <div>
      <div ref={containerRef} className="w-full h-64 rounded-lg border" />
      <p className="text-xs text-muted-foreground mt-1">
        Click the map or drag the pin to set location
      </p>
    </div>
  );
}
