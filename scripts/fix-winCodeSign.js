const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const cacheDir = path.join(process.env.LOCALAPPDATA, 'electron-builder', 'Cache', 'winCodeSign');
const targetDir = path.join(cacheDir, 'winCodeSign-2.6.0');
const url = 'https://github.com/electron-userland/electron-builder-binaries/releases/download/winCodeSign-2.6.0/winCodeSign-2.6.0.7z';

// Create cache directory if needed
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

// Download winCodeSign package
console.log('Downloading winCodeSign package...');
execSync(`curl -L -o "${path.join(cacheDir, 'winCodeSign-2.6.0.7z')}" "${url}"`);

// Extract only Windows files (skip macOS directories)
console.log('Extracting Windows files...');
execSync(`"${path.join(process.cwd(), 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe')}" x -bd "${path.join(cacheDir, 'winCodeSign-2.6.0.7z')}" -o"${targetDir}" -r -x!*darwin*`);

console.log('winCodeSign cache prepared successfully!');