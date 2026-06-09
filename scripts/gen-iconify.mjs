// Builds a trimmed, OFFLINE line-md icon collection containing only the icons
// the app uses, so we don't bundle the full 1.4MB set or hit the Iconify API.
//
// Add icon names to NEEDED, then run: node scripts/gen-iconify.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const collection = require("@iconify-json/line-md/icons.json");

// Keep this list in sync with the icons used via <Icon icon="line-md:..." />.
const NEEDED = [
  "home",
  "home-simple-filled",
  "search",
  "heart",
  "heart-filled",
  "account",
  "menu",
  "briefcase",
  "log-out",
  "log-in",
  "map-marker",
  "bell",
  "calendar",
  "star",
  "star-filled",
  "person",
  "chevron-left",
  "chevron-right",
  "chevron-down",
  "close",
  "plus",
  "check-all",
  "loading-loop",
  "loading-twotone-loop",
];

const icons = {};
const found = [];
const missing = [];
for (const name of NEEDED) {
  if (collection.icons[name]) {
    icons[name] = collection.icons[name];
    found.push(name);
  } else {
    missing.push(name);
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
writeFileSync("src/generated/iconify-line-md.json", JSON.stringify(out));

console.log(`Wrote ${found.length} icons to src/generated/iconify-line-md.json`);
if (missing.length) console.warn("Missing (not in line-md):", missing.join(", "));
