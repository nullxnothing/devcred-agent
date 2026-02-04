/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const extensionDir = path.join(__dirname, '..', 'extension');
const outputPath = path.join(__dirname, '..', 'public', 'devkarma-extension.zip');

// Check if extension directory exists
if (!fs.existsSync(extensionDir)) {
  console.log('Extension directory not found, skipping zip creation');
  process.exit(0);
}

// Remove old zip if exists
if (fs.existsSync(outputPath)) {
  fs.unlinkSync(outputPath);
}

// Create zip based on platform
const isWindows = process.platform === 'win32';

try {
  if (isWindows) {
    execSync(`powershell -Command "Compress-Archive -Path '${extensionDir}\\*' -DestinationPath '${outputPath}' -Force"`, { stdio: 'inherit' });
  } else {
    execSync(`cd "${extensionDir}" && zip -r "${outputPath}" .`, { stdio: 'inherit' });
  }
  console.log('✓ Extension zip created: public/devkarma-extension.zip');
} catch (error) {
  console.error('Failed to create extension zip:', error.message);
  process.exit(1);
}
