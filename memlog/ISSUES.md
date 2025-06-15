# Known Issues

## High Priority
1. Webpack build warnings about mode option
2. Electron-reload fsevents module not found (Windows compatibility)

## Medium Priority
1. Three-pane layout needs responsive improvements for tablet
2. Dark mode color scheme needs contrast testing

## Medium Priority
3. Real-time data latency monitoring
4. WebSocket connection stability - RESOLVED
   - Implemented exponential backoff with jitter for reconnections
   - Added heartbeat mechanism to maintain connection
   - Added message queuing during disconnections
   - Integrated connection status with Redux store

## Low Priority
1. Missing ESLint configuration
2. TypeScript strict mode not fully implemented
3. Position P&L calculation performance

## Windows Build Symlink Issue Resolution

**Issue**: Electron-builder Windows deployment failed with "Cannot create symbolic link: A required privilege is not held by the client" during winCodeSign extraction.

**Root Cause**: The winCodeSign package contains macOS libraries (dylib files) that attempt to create symbolic links during extraction on Windows systems. This conflicts with Windows security policies.

**Solution**:
1. Created custom script `scripts/fix-winCodeSign.js` to:
   - Download winCodeSign package
   - Extract only Windows-relevant files (skipping macOS directories)
2. Modified build process to run this script before electron-builder

**Implementation**:
```javascript
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const cacheDir = path.join(process.env.LOCALAPPDATA, 'electron-builder', 'Cache', 'winCodeSign');
const targetDir = path.join(cacheDir, 'winCodeSign-2.6.0');
const url = 'https://github.com/electron-userland/electron-builder-binaries/releases/download/winCodeSign-2.6.0/winCodeSign-2.6.0.7z';

if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

execSync(`curl -L -o "${path.join(cacheDir, 'winCodeSign-2.6.0.7z')}" "${url}"`);
execSync(`"${path.join(process.cwd(), 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe')}" x -bd "${path.join(cacheDir, 'winCodeSign-2.6.0.7z')}" -o"${targetDir}" -r -x!*darwin*`);
```

**Build Command**:
```bash
node scripts/fix-winCodeSign.js
npm run electron:build
```

**Verification**: Windows build completed successfully after implementing this solution.
