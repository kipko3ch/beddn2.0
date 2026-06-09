// Cascading-location data loader. The actual data is built from official CSVs
// by scripts/build-locations.mjs and served as static JSON from /public/locations
// (lazy-loaded so it never bloats the JS bundle).
//
//   Kenya:    County -> Constituency -> Ward          (mode "file")
//   Tanzania: Region -> District -> Ward -> Street     (mode "region-files")
//   Uganda / Rwanda: manual entry                      (mode "manual")

export type CountryMode = "file" | "region-files" | "manual";

export interface CountryMeta {
  code: string;
  name: string;
  mode: CountryMode;
  levels: string[];
  file?: string; // mode "file"
  regions?: { name: string; file: string }[]; // mode "region-files"
}

export interface LocationIndex {
  countries: CountryMeta[];
}

// Kenya file shape
export interface KeData {
  levels: string[];
  counties: {
    name: string;
    constituencies: { name: string; wards: string[] }[];
  }[];
}

// Tanzania per-region file shape
export interface TzRegionData {
  region: string;
  levels: string[];
  districts: {
    name: string;
    wards: { name: string; streets: string[] }[];
  }[];
}

const cache = new Map<string, unknown>();

async function getJson<T>(path: string): Promise<T> {
  if (cache.has(path)) return cache.get(path) as T;
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  const data = (await res.json()) as T;
  cache.set(path, data);
  return data;
}

export function loadIndex(): Promise<LocationIndex> {
  return getJson<LocationIndex>("/locations/index.json");
}

export function loadCountryFile<T>(file: string): Promise<T> {
  return getJson<T>(`/locations/${file}`);
}

// Display helper — source data is ALL CAPS; show it nicely while keeping
// well-known acronyms uppercase.
const KEEP_UPPER = new Set(["cbd", "a", "b", "c", "d", "e", "ii", "iii"]);
export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((w) =>
      KEEP_UPPER.has(w.replace(/[^a-z]/g, ""))
        ? w.toUpperCase()
        : w.charAt(0).toUpperCase() + w.slice(1)
    )
    .join(" ")
    .replace(/"/g, "");
}
