"use client";

import { Icon as IconifyIcon, addCollection, type IconProps } from "@iconify/react";
import lineMd from "@/generated/iconify-line-md.json";

// Register the bundled (offline) line-md animated icons once, so icons render
// without any runtime calls to the Iconify API.
addCollection(lineMd as Parameters<typeof addCollection>[0]);

/**
 * App icon component backed by Iconify's animated `line-md` set, bundled
 * offline. Use like: <Icon icon="line-md:home" width={24} />
 */
export function Icon(props: IconProps) {
  return <IconifyIcon {...props} />;
}
