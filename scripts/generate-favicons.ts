/**
 * Generate favicon and logo sizes from the main logo
 * Run with: npx tsx scripts/generate-favicons.ts
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const SOURCE_LOGO = path.join(__dirname, '../public/logo-main.png');
const PUBLIC_DIR = path.join(__dirname, '../public');
const APP_DIR = path.join(__dirname, '../app');

interface IconSize {
  name: string;
  size: number;
  dir?: string;
}

const SIZES: IconSize[] = [
  // Favicons
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'favicon-96x96.png', size: 96 },

  // Apple touch icons
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'apple-touch-icon-152x152.png', size: 152 },
  { name: 'apple-touch-icon-180x180.png', size: 180 },

  // Android/PWA icons
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },

  // Open Graph / Social
  { name: 'og-image.png', size: 1200 },

  // General logo sizes
  { name: 'logo-64.png', size: 64 },
  { name: 'logo-128.png', size: 128 },
  { name: 'logo-256.png', size: 256 },

  // Next.js App Router icons
  { name: 'icon.png', size: 32, dir: APP_DIR },
  { name: 'apple-icon.png', size: 180, dir: APP_DIR },
];

async function generateFavicons() {
  console.log('Generating favicons from:', SOURCE_LOGO);

  if (!fs.existsSync(SOURCE_LOGO)) {
    console.error('Source logo not found:', SOURCE_LOGO);
    process.exit(1);
  }

  for (const { name, size, dir = PUBLIC_DIR } of SIZES) {
    const outputPath = path.join(dir, name);

    try {
      await sharp(SOURCE_LOGO)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputPath);

      console.log(`✓ Generated ${name} (${size}x${size})`);
    } catch (error) {
      console.error(`✗ Failed to generate ${name}:`, error);
    }
  }

  // Generate ICO file (multi-resolution)
  try {
    const icoBuffer = await sharp(SOURCE_LOGO)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toBuffer();

    fs.writeFileSync(path.join(APP_DIR, 'favicon.ico'), icoBuffer);
    console.log('✓ Generated favicon.ico (32x32)');
  } catch (error) {
    console.error('✗ Failed to generate favicon.ico:', error);
  }

  console.log('\nDone! Favicon generation complete.');
}

generateFavicons().catch(console.error);
