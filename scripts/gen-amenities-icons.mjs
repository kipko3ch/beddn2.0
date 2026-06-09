// Builds a trimmed, OFFLINE mdi icon collection containing only the icons the
// amenity catalog and property-type list reference, so we don't bundle the full
// (huge) mdi set or hit the Iconify API at runtime.
//
// It scrapes every `mdi:<name>` string out of src/lib/amenities.ts and
// src/lib/property-types.ts, so there is no separate list to keep in sync.
//
// Run after editing those catalogs:  node scripts/gen-amenities-icons.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const collection = require("@iconify-json/mdi/icons.json");

const SOURCES = [
  "src/lib/amenities.ts",
  "src/lib/property-types.ts",
  "src/lib/experience-types.ts",
];

const names = new Set();
for (const file of SOURCES) {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(/mdi:([a-z0-9-]+)/g)) {
    names.add(match[1]);
  }
}

const icons = {};
const found = [];
const missing = [];
for (const name of [...names].sort()) {
  if (collection.icons[name]) {
    icons[name] = collection.icons[name];
    found.push(name);
  } else {
    missing.push(name);
  }
}

// mdi uses aliases for some names; resolve them so we don't lose icons.
if (collection.aliases) {
  for (const name of missing.slice()) {
    const alias = collection.aliases[name];
    if (alias && collection.icons[alias.parent]) {
      icons[name] = collection.icons[alias.parent];
      found.push(name);
      missing.splice(missing.indexOf(name), 1);
    }
  }
}

const out = {
  prefix: collection.prefix,
  lastModified: collection.lastModified,
  width: collection.width || 24,
  height: collection.height || 24,
  icons,
};

mkdirSync("src/generated", { recursive: true });
writeFileSync("src/generated/iconify-mdi-amenities.json", JSON.stringify(out));

console.log(
  `Wrote ${found.length} mdi icons to src/generated/iconify-mdi-amenities.json`
);
if (missing.length)
  console.warn(
    `\nMissing ${missing.length} (not in mdi — fix the name in the catalog):\n  ${missing.join(
      "\n  "
    )}`
  );
