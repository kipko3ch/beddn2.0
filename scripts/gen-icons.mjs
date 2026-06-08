// Generates the Beddn favicon/app icons from the real Kualine font.
// Converts the "Beddn" wordmark to vector paths so it renders the brand font
// even where page fonts aren't available (favicons, home-screen icons).
//
// Run: node scripts/gen-icons.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import opentypeNs from "opentype.js";
import sharp from "sharp";

const opentype = opentypeNs.default ?? opentypeNs;

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const FONT = join(root, "gc-kualine-font", "GC-Kualine-Demo-BF688b24f63a0c2.ttf");
const MAROON_TOP = "#9a0026";
const MAROON_BOTTOM = "#660019";
const WHITE = "#ffffff";
const TEXT = "Beddn";

const font = opentype.parse(readFileSync(FONT));

// Render the wordmark at a reference size, then fit it into the canvas.
// Build glyph-by-glyph with manual advance widths (avoids a kerning NaN bug
// in opentype.js v2's whole-string getPath).
const REF = 200;
const path = new opentype.Path();
let penX = 0;
for (const ch of TEXT) {
  const glyph = font.charToGlyph(ch);
  const gp = glyph.getPath(penX, 0, REF);
  path.extend(gp);
  penX += (glyph.advanceWidth / font.unitsPerEm) * REF;
}
const bb = path.getBoundingBox();
const wordW = bb.x2 - bb.x1;
const wordH = bb.y2 - bb.y1;

// opentype.js v2's path.toPathData() emits NaN for some commands, so serialize
// the path commands ourselves.
function toSvgPath(commands, precision = 2) {
  const n = (v) => Number(v.toFixed(precision)).toString();
  let d = "";
  for (const c of commands) {
    if (c.type === "M") d += `M${n(c.x)} ${n(c.y)}`;
    else if (c.type === "L") d += `L${n(c.x)} ${n(c.y)}`;
    else if (c.type === "C")
      d += `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`;
    else if (c.type === "Q") d += `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`;
    else if (c.type === "Z") d += "Z";
  }
  return d;
}
const wordPathData = toSvgPath(path.commands);

function buildSvg({ size, pad, radius, bleed }) {
  const target = size - pad * 2;
  const scale = target / wordW;
  const scaledH = wordH * scale;
  const tx = pad - bb.x1 * scale;
  const ty = (size - scaledH) / 2 - bb.y1 * scale;
  const d = wordPathData;
  const bg = bleed
    ? `<rect width="${size}" height="${size}" fill="url(#bg)"/>`
    : `<rect width="${size}" height="${size}" rx="${radius}" fill="url(#bg)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Beddn">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${MAROON_TOP}"/>
      <stop offset="1" stop-color="${MAROON_BOTTOM}"/>
    </linearGradient>
  </defs>
  ${bg}
  <g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(4)})">
    <path d="${d}" fill="${WHITE}"/>
  </g>
</svg>`;
}

// 1. Browser favicon (rounded square, scalable SVG).
const iconSvg = buildSvg({ size: 64, pad: 8, radius: 14, bleed: false });
writeFileSync(join(root, "src", "app", "icon.svg"), iconSvg + "\n");

// 2. Apple touch icon (full-bleed square PNG, iOS adds its own corners).
const appleSvg = buildSvg({ size: 180, pad: 26, radius: 0, bleed: true });
await sharp(Buffer.from(appleSvg)).png().toFile(join(root, "src", "app", "apple-icon.png"));

// 3. PNG favicon fallback for older browsers.
const pngSvg = buildSvg({ size: 64, pad: 8, radius: 12, bleed: false });
await sharp(Buffer.from(pngSvg)).resize(64, 64).png().toFile(join(root, "src", "app", "icon.png"));

console.log("Generated icon.svg, icon.png, apple-icon.png");
