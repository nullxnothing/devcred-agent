import sharp from 'sharp';
import path from 'path';

const SOURCE = path.join(process.cwd(), 'public', 'Untitled design (1).png');
const PUBLIC = path.join(process.cwd(), 'public');

async function generateFavicons() {
  console.log('Generating favicons from:', SOURCE);

  // Generate different sizes
  const sizes = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon-96x96.png', size: 96 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'apple-touch-icon-180x180.png', size: 180 },
    { name: 'apple-touch-icon-152x152.png', size: 152 },
    { name: 'android-chrome-192x192.png', size: 192 },
    { name: 'android-chrome-512x512.png', size: 512 },
    { name: 'logo-64.png', size: 64 },
    { name: 'logo-128.png', size: 128 },
    { name: 'logo-256.png', size: 256 },
  ];

  for (const { name, size } of sizes) {
    await sharp(SOURCE)
      .resize(size, size, { fit: 'contain', background: { r: 251, g: 240, b: 223, alpha: 1 } })
      .png()
      .toFile(path.join(PUBLIC, name));
    console.log(`✓ Generated ${name}`);
  }

  console.log('\nAll favicons generated successfully!');
}

generateFavicons().catch(console.error);
