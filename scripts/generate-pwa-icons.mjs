#!/usr/bin/env node
/**
 * Generates favicon + PWA icons from the Liftly mark (public/landing/liftly-logo.png).
 * Center-crops to a square, then outputs:
 *   - public/: icon-192.png, icon-512.png, apple-touch-icon.png, favicon.ico, preview.png (OG / social)
 *   - app/favicon.ico (Next.js file convention → /favicon.ico)
 * Run: node scripts/generate-pwa-icons.mjs (or npm run generate-icons; runs before build)
 * Requires: sharp, to-ico
 */
import sharp from "sharp";
import toIco from "to-ico";
import { mkdirSync, existsSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const logoPath = join(root, "public", "landing", "liftly-logo.png");
const outDir = join(root, "public");
const appDir = join(root, "app");

if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}
if (!existsSync(appDir)) {
  mkdirSync(appDir, { recursive: true });
}

/** Square crop (portrait logo → centered square) for tab / maskable icons */
async function squareLogoBase() {
  const meta = await sharp(logoPath).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  const side = Math.min(w, h);
  const left = Math.floor((w - side) / 2);
  const top = Math.floor((h - side) / 2);
  return sharp(logoPath).extract({
    left,
    top,
    width: side,
    height: side,
  });
}

async function generate() {
  const base = await squareLogoBase();

  const sizes = [
    { name: "icon-192.png", size: 192 },
    { name: "icon-512.png", size: 512 },
    { name: "apple-touch-icon.png", size: 180 },
  ];

  for (const { name, size } of sizes) {
    await base.clone().resize(size, size).png().toFile(join(outDir, name));
    console.log(`Generated public/${name}`);
  }

  const faviconSizes = [16, 32, 48];
  const pngBuffers = await Promise.all(
    faviconSizes.map((s) => base.clone().resize(s, s).png().toBuffer())
  );
  const icoBuffer = await toIco(pngBuffers);
  writeFileSync(join(outDir, "favicon.ico"), icoBuffer);
  writeFileSync(join(appDir, "favicon.ico"), icoBuffer);
  console.log("Generated public/favicon.ico");
  console.log("Generated app/favicon.ico");

  const ogLogo = await base.clone().resize(480, 480).png().toBuffer();
  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 3,
      background: { r: 9, g: 9, b: 11 },
    },
  })
    .composite([{ input: ogLogo, gravity: "center" }])
    .png()
    .toFile(join(outDir, "preview.png"));
  console.log("Generated public/preview.png");
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
