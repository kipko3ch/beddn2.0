"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Listing } from "@/lib/types";

// Google-Maps-default look: CARTO "voyager" vector style — colored roads,
// green parks, blue water, and POI labels (close to maps.google.com default).
const MAP_STYLE = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

// Pins whose screen positions fall within this many pixels of each other are
// merged into one marker — otherwise same-building listings (a common case:
// several units in one apartment block) stack illegibly on top of each other.
const CLUSTER_PIXEL_RADIUS = 34;

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

function listingPrice(listing: Listing, priceMode: "hourly" | "overnight" | "experience") {
  return priceMode === "overnight" && listing.overnight_price
    ? listing.overnight_price
    : priceMode === "experience" && listing.experience_price
    ? listing.experience_price
    : priceMode === "hourly" && listing.hourly_price
    ? listing.hourly_price
    : listing.hourly_price ?? listing.overnight_price ?? listing.experience_price ?? 0;
}

function listingHref(listing: Listing) {
  const isExp = (listing.categories || listing.category || []).includes("experience");
  return isExp ? `/experience/${listing.slug}` : `/property/${listing.slug}`;
}

/** Builds the card shown inside the map popup — image, name, rating, price,
 * and (for a cluster of nearby listings) prev/next controls to page through
 * them without the popup closing or the map moving. */
function buildPopupCard(
  group: Listing[],
  index: number,
  priceMode: "hourly" | "overnight" | "experience",
  onIndexChange: (next: number) => void,
  onSelect: (listing: Listing) => void
): HTMLElement {
  const listing = group[index];
  const image = listing.listing_images?.[0]?.url;
  const reviews = listing.reviews ?? [];
  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;
  const price = listingPrice(listing, priceMode);

  const card = document.createElement("div");
  card.style.cssText = "width: 240px; font-family: inherit; overflow: hidden; border-radius: 16px;";

  const imageWrap = document.createElement("a");
  imageWrap.href = listingHref(listing);
  imageWrap.style.cssText = "display: block; position: relative; width: 100%; height: 150px; background: #f1e6ea;";
  if (image) {
    const img = document.createElement("img");
    img.src = image;
    img.alt = "";
    img.style.cssText = "width: 100%; height: 100%; object-fit: cover; display: block;";
    imageWrap.appendChild(img);
  }

  if (group.length > 1) {
    const badge = document.createElement("span");
    badge.textContent = `${index + 1} / ${group.length}`;
    badge.style.cssText =
      "position: absolute; left: 8px; bottom: 8px; background: rgba(0,0,0,0.6); color: #fff; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px;";
    imageWrap.appendChild(badge);

    const makeArrow = (dir: "prev" | "next") => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("aria-label", dir === "prev" ? "Previous listing here" : "Next listing here");
      btn.textContent = dir === "prev" ? "‹" : "›";
      btn.style.cssText = `
        position: absolute; top: 50%; ${dir === "prev" ? "left: 8px;" : "right: 8px;"}
        transform: translateY(-50%); width: 26px; height: 26px; border-radius: 999px;
        border: none; background: rgba(255,255,255,0.95); color: #2b000a; font-size: 16px;
        font-weight: 700; line-height: 1; cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      `;
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const next = dir === "prev" ? (index - 1 + group.length) % group.length : (index + 1) % group.length;
        onIndexChange(next);
      });
      return btn;
    };
    imageWrap.appendChild(makeArrow("prev"));
    imageWrap.appendChild(makeArrow("next"));
  }

  const body = document.createElement("a");
  body.href = listingHref(listing);
  body.style.cssText = "display: block; padding: 10px 12px 12px; text-decoration: none; color: inherit;";

  const title = document.createElement("p");
  title.textContent = listing.title || listing.name;
  title.style.cssText =
    "margin: 0; font-size: 13px; font-weight: 700; color: #2b000a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;";
  body.appendChild(title);

  if (reviews.length > 0) {
    const rating = document.createElement("p");
    rating.textContent = `★ ${avgRating.toFixed(1)} (${reviews.length})`;
    rating.style.cssText = "margin: 2px 0 0; font-size: 12px; color: #6f6568;";
    body.appendChild(rating);
  }

  const priceLine = document.createElement("p");
  priceLine.textContent = `${listing.currency || "KES"} ${Number(price).toLocaleString()}`;
  priceLine.style.cssText = "margin: 6px 0 0; font-size: 13px; font-weight: 800; color: #800020;";
  body.appendChild(priceLine);

  body.addEventListener("click", () => onSelect(listing));
  imageWrap.addEventListener("click", () => onSelect(listing));

  card.appendChild(imageWrap);
  card.appendChild(body);
  return card;
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
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const listingsRef = useRef(listings);
  useEffect(() => {
    listingsRef.current = listings;
  }, [listings]);

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

    const openPopup = (group: Listing[], lngLat: [number, number]) => {
      popupRef.current?.remove();
      let index = 0;
      const popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: false,
        offset: 14,
        maxWidth: "none",
        className: "beddn-map-popup",
      }).setLngLat(lngLat);

      const render = () => {
        popup.setDOMContent(
          buildPopupCard(
            group,
            index,
            priceMode,
            (next) => {
              index = next;
              render();
            },
            (listing) => onPinClick?.(listing)
          )
        );
      };
      render();
      popup.addTo(map);
      popupRef.current = popup;
    };

    const rebuildMarkers = () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
      const currentListings = listingsRef.current;

      if (approximate) {
        currentListings.forEach((listing) => {
          const el = document.createElement("div");
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
          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([listing.longitude, listing.latitude])
            .addTo(map);
          markersRef.current.set(listing.id, marker);
        });
        return;
      }

      // Greedy pixel-distance clustering: listings that currently render on
      // top of (or right next to) each other on screen become one marker,
      // recomputed on every pan/zoom since screen position depends on both.
      const groups: { anchor: { x: number; y: number }; lngLat: [number, number]; items: Listing[] }[] = [];
      currentListings.forEach((listing) => {
        const point = map.project([listing.longitude, listing.latitude]);
        const group = groups.find(
          (g) => Math.hypot(g.anchor.x - point.x, g.anchor.y - point.y) < CLUSTER_PIXEL_RADIUS
        );
        if (group) {
          group.items.push(listing);
        } else {
          groups.push({ anchor: point, lngLat: [listing.longitude, listing.latitude], items: [listing] });
        }
      });

      groups.forEach((group) => {
        const items = group.items;
        const isCluster = items.length > 1;
        const lowest = items.reduce((min, l) => {
          const p = listingPrice(l, priceMode);
          return p > 0 && (min === 0 || p < min) ? p : min;
        }, 0);
        const active = items.some((l) => l.id === highlightedId);

        const el = document.createElement("div");
        el.className = "map-price-pin";
        el.textContent = isCluster
          ? `${items[0].currency || "KES"} ${Number(lowest).toLocaleString()} · ${items.length}`
          : `${items[0].currency || "KES"} ${Number(listingPrice(items[0], priceMode)).toLocaleString()}`;
        el.style.cssText = `
          background: ${active ? "#800020" : "#fff"};
          border: 1px solid ${active ? "#800020" : isCluster ? "#e8547b" : "rgba(24,17,19,0.16)"};
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
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          openPopup(items, group.lngLat);
        });

        const marker = new maplibregl.Marker({ element: el }).setLngLat(group.lngLat).addTo(map);
        items.forEach((listing) => markersRef.current.set(listing.id, marker));
      });

      if (currentListings.length > 1 && !highlightedId) {
        const bounds = new maplibregl.LngLatBounds();
        currentListings.forEach((l) => bounds.extend([l.longitude, l.latitude]));
        map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
      }
    };

    rebuildMarkers();
    // Pixel positions shift on every pan/zoom, so re-cluster once the user
    // settles rather than mid-gesture (moveend, not move — avoids thrashing).
    map.on("moveend", rebuildMarkers);
    return () => {
      map.off("moveend", rebuildMarkers);
    };
  }, [listings, highlightedId, approximate, onPinClick, priceMode]);

  return <div ref={containerRef} className={className} />;
}
