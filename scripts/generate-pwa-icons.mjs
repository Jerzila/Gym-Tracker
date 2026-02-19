#!/usr/bin/env node
/**
 * Generates 192x192 and 512x512 PNG icons from public/icons/icon.svg for the PWA manifest.
 * Run: node scripts/generate-pwa-icons.mjs (or npm run generate-icons)
 * Requires: npm install -D sharp
 */
import sharp from "sharp";
import { readFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const svgPath = join(root, "public", "icons", "icon.svg");
const outDir = join(root, "public", "icons");

if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

const svg = readFileSync(svgPath);

async function generate() {
  for (const size of [192, 512]) {
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(join(outDir, `icon-${size}x${size}.png`));
    console.log(`Generated public/icons/icon-${size}x${size}.png`);
  }
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
