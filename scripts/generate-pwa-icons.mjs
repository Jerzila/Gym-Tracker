#!/usr/bin/env node
/**
 * Generates PWA icons from public/icons/icon.svg (black bg + grey dumbbell).
 * Outputs to public/: icon-192.png, icon-512.png, apple-touch-icon.png, favicon.ico
 * Run: node scripts/generate-pwa-icons.mjs (or npm run generate-icons)
 * Requires: npm install -D sharp to-ico
 */
import sharp from "sharp";
import toIco from "to-ico";
import { readFileSync, mkdirSync, existsSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const svgPath = join(root, "public", "icons", "icon.svg");
const outDir = join(root, "public");

if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

const svg = readFileSync(svgPath);

async function generate() {
  const sizes = [
    { name: "icon-192.png", size: 192 },
    { name: "icon-512.png", size: 512 },
    { name: "apple-touch-icon.png", size: 180 },
  ];

  for (const { name, size } of sizes) {
    await sharp(svg).resize(size, size).png().toFile(join(outDir, name));
    console.log(`Generated public/${name}`);
  }

  // Favicon.ico: to-ico expects PNG buffers of allowed sizes (16, 24, 32, 48, 64, 128, 256)
  const faviconSizes = [16, 32];
  const pngBuffers = await Promise.all(
    faviconSizes.map((s) =>
      sharp(svg).resize(s, s).png().toBuffer()
    )
  );
  const icoBuffer = await toIco(pngBuffers);
  writeFileSync(join(outDir, "favicon.ico"), icoBuffer);
  console.log("Generated public/favicon.ico");
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
