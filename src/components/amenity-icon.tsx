"use client";

import { Icon as IconifyIcon, addCollection, type IconProps } from "@iconify/react";
import mdiAmenities from "@/generated/iconify-mdi-amenities.json";

// Register the bundled (offline) mdi subset used by the amenity catalog and
// property-type list, so amenity/property icons render with no runtime calls to
// the Iconify API. Mirrors components/icon.tsx (which bundles line-md).
addCollection(mdiAmenities as Parameters<typeof addCollection>[0]);

/** Renders an offline mdi icon, e.g. <AmenityIcon icon="mdi:wifi" width={20} /> */
export function AmenityIcon(props: IconProps) {
  return <IconifyIcon {...props} />;
}
