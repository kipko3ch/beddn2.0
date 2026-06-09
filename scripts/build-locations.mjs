// Builds the cascading-location dataset from the raw government CSV files into
// static JSON served from /public (lazy-loaded by components/location-picker).
//
//   Kenya:    County -> Constituency -> Ward          (one file: ke.json)
//   Tanzania: Region -> District -> Ward -> Street    (one file per region)
//   Uganda / Rwanda: manual entry (no data) — handled in the UI.
//
// The CSVs are NOT committed; only the generated JSON is. Re-run when the source
// data changes:
//   node scripts/build-locations.mjs "C:/path/to/location/csv/folder"
//
// Default source folder (the maintainer's machine):
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";

const SRC =
  process.argv[2] ||
  "C:/Users/KIPKOECH/Downloads/cartier images/location";
const OUT = "public/locations";

if (!existsSync(SRC)) {
  console.error(`Source folder not found: ${SRC}`);
  process.exit(1);
}

// --- Minimal RFC-4180 CSV parser (handles quotes and "" escapes) -----------
function parseCsv(text) {
  // Strip BOM.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c === "\r") {
      // skip
    } else {
      field += c;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const clean = (s) => (s ?? "").trim();

mkdirSync(OUT, { recursive: true });
mkdirSync(join(OUT, "tz"), { recursive: true });

const index = { countries: [] };

// --- KENYA -----------------------------------------------------------------
const keFile = readdirSync(SRC).find((f) => /kenya/i.test(f) && f.endsWith(".csv"));
if (keFile) {
  const rows = parseCsv(readFileSync(join(SRC, keFile), "utf8"));
  const header = rows.shift().map((h) => h.toLowerCase().trim());
  const ci = {
    county: header.findIndex((h) => h.includes("county name")),
    constituency: header.findIndex((h) => h.includes("constituency name")),
    ward: header.findIndex((h) => h.includes("ward name")),
  };
  const counties = new Map();
  for (const r of rows) {
    const county = clean(r[ci.county]);
    const constituency = clean(r[ci.constituency]);
    const ward = clean(r[ci.ward]);
    if (!county) continue;
    if (!counties.has(county)) counties.set(county, new Map());
    const consts = counties.get(county);
    if (!consts.has(constituency)) consts.set(constituency, new Set());
    if (ward) consts.get(constituency).add(ward);
  }
  const data = {
    levels: ["County", "Constituency", "Ward"],
    counties: [...counties.entries()].map(([name, consts]) => ({
      name,
      constituencies: [...consts.entries()].map(([cname, wards]) => ({
        name: cname,
        wards: [...wards],
      })),
    })),
  };
  writeFileSync(join(OUT, "ke.json"), JSON.stringify(data));
  index.countries.push({
    code: "KE",
    name: "Kenya",
    mode: "file",
    file: "ke.json",
    levels: data.levels,
  });
  console.log(`KE: ${data.counties.length} counties -> ke.json`);
}

// --- TANZANIA (one file per region CSV) ------------------------------------
const tzRegions = [];
for (const f of readdirSync(SRC)) {
  if (!f.endsWith(".csv") || /kenya/i.test(f)) continue;
  const rows = parseCsv(readFileSync(join(SRC, f), "utf8"));
  const header = rows.shift().map((h) => h.toLowerCase().trim());
  const idx = {
    region: header.indexOf("region"),
    district: header.indexOf("district"),
    ward: header.indexOf("ward"),
    street: header.indexOf("street"),
  };
  if (idx.region < 0 || idx.district < 0) continue;

  let regionName = "";
  const districts = new Map();
  for (const r of rows) {
    regionName = clean(r[idx.region]) || regionName;
    const district = clean(r[idx.district]);
    const ward = clean(r[idx.ward]);
    const street = clean(r[idx.street]);
    if (!district) continue;
    if (!districts.has(district)) districts.set(district, new Map());
    const wards = districts.get(district);
    if (ward && !wards.has(ward)) wards.set(ward, new Set());
    if (ward && street) wards.get(ward).add(street);
  }

  const slug = basename(f, ".csv");
  const data = {
    region: regionName,
    levels: ["Region", "District", "Ward", "Street"],
    districts: [...districts.entries()].map(([name, wards]) => ({
      name,
      wards: [...wards.entries()].map(([wname, streets]) => ({
        name: wname,
        streets: [...streets],
      })),
    })),
  };
  writeFileSync(join(OUT, "tz", `${slug}.json`), JSON.stringify(data));
  tzRegions.push({ name: regionName || slug, file: `tz/${slug}.json` });
}

if (tzRegions.length) {
  tzRegions.sort((a, b) => a.name.localeCompare(b.name));
  index.countries.push({
    code: "TZ",
    name: "Tanzania",
    mode: "region-files",
    regions: tzRegions,
    levels: ["Region", "District", "Ward", "Street"],
  });
  console.log(`TZ: ${tzRegions.length} regions -> tz/*.json`);
}

// --- Manual-entry countries ------------------------------------------------
index.countries.push(
  { code: "UG", name: "Uganda", mode: "manual", levels: ["Region", "District", "Area"] },
  { code: "RW", name: "Rwanda", mode: "manual", levels: ["Province", "District", "Sector"] }
);

writeFileSync(join(OUT, "index.json"), JSON.stringify(index));
console.log(`\nWrote ${OUT}/index.json with ${index.countries.length} countries.`);
