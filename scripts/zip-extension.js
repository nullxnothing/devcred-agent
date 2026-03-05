/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const extensionDir = path.join(__dirname, '..', 'extension');
const outputPath = path.join(__dirname, '..', 'public', 'devkarma-extension.zip');

// Check if extension directory exists
if (!fs.existsSync(extensionDir)) {
  console.log('Extension directory not found, skipping zip creation');
  process.exit(0);
}

// Ensure public directory exists
const publicDir = path.dirname(outputPath);
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Remove old zip if exists
if (fs.existsSync(outputPath)) {
  fs.unlinkSync(outputPath);
}

// Create zip using archiver (cross-platform, no system dependencies)
const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`✓ Extension zip created: public/devkarma-extension.zip (${archive.pointer()} bytes)`);
});

archive.on('error', (err) => {
  console.error('Failed to create extension zip:', err.message);
  process.exit(1);
});

archive.pipe(output);
archive.directory(extensionDir, false);
archive.finalize();
