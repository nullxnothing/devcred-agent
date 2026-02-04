/* eslint-disable @typescript-eslint/no-require-imports */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SOURCE = path.join(__dirname, '..', 'public', 'Untitled design (69).png');

const targets = [
  // App icons
  { path: 'app/icon.png', size: 512 },
  { path: 'app/apple-icon.png', size: 180 },
  
  // Public favicons
  { path: 'public/favicon.png', size: 64 },
  { path: 'public/favicon-16x16.png', size: 16 },
  { path: 'public/favicon-32x32.png', size: 32 },
  { path: 'public/favicon-96x96.png', size: 96 },
  { path: 'public/apple-touch-icon.png', size: 180 },
  { path: 'public/apple-touch-icon-152x152.png', size: 152 },
  { path: 'public/apple-touch-icon-180x180.png', size: 180 },
  { path: 'public/android-chrome-192x192.png', size: 192 },
  { path: 'public/android-chrome-512x512.png', size: 512 },
  { path: 'public/logo-64.png', size: 64 },
  { path: 'public/logo-128.png', size: 128 },
  { path: 'public/logo-256.png', size: 256 },
  { path: 'public/logo-main.png', size: 512 },
  
  // Extension icons
  { path: 'extension/icons/icon16.png', size: 16 },
  { path: 'extension/icons/icon32.png', size: 32 },
  { path: 'extension/icons/icon48.png', size: 48 },
  { path: 'extension/icons/icon128.png', size: 128 },
];

async function generateIcons() {
  if (!fs.existsSync(SOURCE)) {
    console.error('❌ Source image not found at:', SOURCE);
    console.log('Please save the shield logo image to public/shield-logo.png first');
    process.exit(1);
  }

  console.log('🛡️ Generating icons from shield logo...\n');

  for (const target of targets) {
    const outputPath = path.join(__dirname, '..', target.path);
    
    try {
      await sharp(SOURCE)
        .resize(target.size, target.size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ ${target.path} (${target.size}x${target.size})`);
    } catch (err) {
      console.error(`❌ Failed to generate ${target.path}:`, err.message);
    }
  }

  console.log('\n🎉 Icon generation complete!');
  console.log('\nNote: You may need to manually convert public/favicon.png to favicon.ico');
}

generateIcons();
