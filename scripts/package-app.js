#!/usr/bin/env node

/**
 * Application Packaging Script for Options Tutor
 * Creates distributable packages for different platforms
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class AppPackager {
  constructor() {
    this.rootDir = path.join(__dirname, '..');
    this.distDir = path.join(this.rootDir, 'dist');
    this.releaseDir = path.join(this.rootDir, 'release');
    this.packageJson = require(path.join(this.rootDir, 'package.json'));
  }

  async package() {
    console.log('📦 Starting Application Packaging for Options Tutor');
    console.log(`🏷️ Version: ${this.packageJson.version}`);
    console.log('=' .repeat(60));

    try {
      // Pre-package validation
      await this.prePackageValidation();
      
      // Setup packaging environment
      await this.setupPackagingEnvironment();
      
      // Create Electron Builder configuration
      await this.createElectronBuilderConfig();
      
      // Package for current platform
      await this.packageCurrentPlatform();
      
      // Create installer
      await this.createInstaller();
      
      // Generate package report
      await this.generatePackageReport();
      
      console.log('\n✅ Application packaging completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Application packaging failed:', error.message);
      process.exit(1);
    }
  }

  async prePackageValidation() {
    console.log('🔍 Pre-package validation...');
    
    // Check if build exists
    if (!fs.existsSync(this.distDir)) {
      throw new Error('Build directory not found. Run production build first.');
    }
    
    // Check required build files
    const requiredFiles = ['index.html', 'main.js', 'package.json'];
    requiredFiles.forEach(file => {
      if (!fs.existsSync(path.join(this.distDir, file))) {
        throw new Error(`Required build file missing: ${file}`);
      }
    });
    
    // Check electron-builder is installed
    try {
      execSync('npx electron-builder --version', { stdio: 'pipe' });
    } catch (error) {
      throw new Error('electron-builder not found. Install with: npm install --save-dev electron-builder');
    }
    
    console.log('   ✅ Pre-package validation passed');
  }

  async setupPackagingEnvironment() {
    console.log('⚙️ Setting up packaging environment...');
    
    // Create release directory
    if (!fs.existsSync(this.releaseDir)) {
      fs.mkdirSync(this.releaseDir, { recursive: true });
    }
    
    // Copy icons and assets
    await this.copyPackagingAssets();
    
    console.log('   ✅ Packaging environment ready');
  }

  async copyPackagingAssets() {
    const assetsDir = path.join(this.rootDir, 'assets');
    const iconsDir = path.join(assetsDir, 'icons');
    
    // Create assets directory if it doesn't exist
    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir, { recursive: true });
      
      // Create placeholder icon (in production, use actual icons)
      const placeholderIcon = this.createPlaceholderIcon();
      fs.writeFileSync(path.join(iconsDir, 'icon.png'), placeholderIcon);
      fs.writeFileSync(path.join(iconsDir, 'icon.ico'), placeholderIcon);
      fs.writeFileSync(path.join(iconsDir, 'icon.icns'), placeholderIcon);
    }
  }

  createPlaceholderIcon() {
    // In a real implementation, this would create or copy actual icon files
    // For now, return empty buffer as placeholder
    return Buffer.alloc(0);
  }

  async createElectronBuilderConfig() {
    console.log('📝 Creating Electron Builder configuration...');
    
    const config = {
      appId: 'com.optionstutor.app',
      productName: 'Options Tutor',
      directories: {
        output: 'release',
        app: 'dist'
      },
      files: [
        'dist/**/*',
        'node_modules/**/*',
        '!node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}',
        '!node_modules/*/{test,__tests__,tests,powered-test,example,examples}',
        '!node_modules/*.d.ts',
        '!node_modules/.bin',
        '!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}',
        '!.editorconfig',
        '!**/._*',
        '!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}',
        '!**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.nyc_output}',
        '!**/{appveyor.yml,.travis.yml,circle.yml}',
        '!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}'
      ],
      extraResources: [
        {
          from: 'assets',
          to: 'assets',
          filter: ['**/*']
        }
      ],
      win: {
        target: [
          {
            target: 'nsis',
            arch: ['x64']
          },
          {
            target: 'portable',
            arch: ['x64']
          }
        ],
        icon: 'assets/icons/icon.ico',
        publisherName: 'Options Tutor',
        verifyUpdateCodeSignature: false
      },
      nsis: {
        oneClick: false,
        allowToChangeInstallationDirectory: true,
        createDesktopShortcut: true,
        createStartMenuShortcut: true,
        shortcutName: 'Options Tutor',
        include: 'scripts/installer.nsh'
      },
      mac: {
        target: [
          {
            target: 'dmg',
            arch: ['x64', 'arm64']
          }
        ],
        icon: 'assets/icons/icon.icns',
        category: 'public.app-category.finance'
      },
      linux: {
        target: [
          {
            target: 'AppImage',
            arch: ['x64']
          },
          {
            target: 'deb',
            arch: ['x64']
          }
        ],
        icon: 'assets/icons/icon.png',
        category: 'Office'
      },
      publish: null, // Disable auto-publish
      compression: 'maximum',
      removePackageScripts: true,
      nodeGypRebuild: false,
      buildDependenciesFromSource: false
    };
    
    fs.writeFileSync(
      path.join(this.rootDir, 'electron-builder.json'),
      JSON.stringify(config, null, 2)
    );
    
    console.log('   ✅ Electron Builder configuration created');
  }

  async packageCurrentPlatform() {
    console.log(`📦 Packaging for ${process.platform}...`);
    
    try {
      const platform = this.getPlatformTarget();
      execSync(`npx electron-builder --${platform} --config electron-builder.json`, {
        stdio: 'inherit',
        cwd: this.rootDir
      });
      
      console.log(`   ✅ ${process.platform} package created`);
    } catch (error) {
      throw new Error(`Packaging failed for ${process.platform}: ${error.message}`);
    }
  }

  getPlatformTarget() {
    switch (process.platform) {
      case 'win32':
        return 'win';
      case 'darwin':
        return 'mac';
      case 'linux':
        return 'linux';
      default:
        throw new Error(`Unsupported platform: ${process.platform}`);
    }
  }

  async createInstaller() {
    console.log('🔧 Creating installer...');
    
    // Create NSIS installer script for Windows
    if (process.platform === 'win32') {
      await this.createNSISScript();
    }
    
    // Create auto-updater configuration
    await this.createAutoUpdaterConfig();
    
    console.log('   ✅ Installer configuration created');
  }

  async createNSISScript() {
    const nsisScript = `
; Options Tutor Installer Script
!define APPNAME "Options Tutor"
!define COMPANYNAME "Options Tutor"
!define DESCRIPTION "Advanced Options Trading Education Platform"
!define VERSIONMAJOR 1
!define VERSIONMINOR 0
!define VERSIONBUILD 0

; Main installer attributes
Name "\${APPNAME}"
InstallDir "$PROGRAMFILES64\\\${COMPANYNAME}\\\${APPNAME}"
RequestExecutionLevel admin
OutFile "Options-Tutor-Setup.exe"

; Version information
VIProductVersion "\${VERSIONMAJOR}.\${VERSIONMINOR}.\${VERSIONBUILD}.0"
VIAddVersionKey ProductName "\${APPNAME}"
VIAddVersionKey CompanyName "\${COMPANYNAME}"
VIAddVersionKey ProductVersion "\${VERSIONMAJOR}.\${VERSIONMINOR}.\${VERSIONBUILD}"
VIAddVersionKey FileDescription "\${DESCRIPTION}"
VIAddVersionKey FileVersion "\${VERSIONMAJOR}.\${VERSIONMINOR}.\${VERSIONBUILD}.0"

; Modern UI
!include "MUI2.nsh"
!define MUI_ABORTWARNING
!define MUI_ICON "assets\\icons\\icon.ico"
!define MUI_UNICON "assets\\icons\\icon.ico"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; Languages
!insertmacro MUI_LANGUAGE "English"

; Installer sections
Section "Main Application" SecMain
    SetOutPath "$INSTDIR"
    File /r "dist\\*.*"
    
    ; Create shortcuts
    CreateDirectory "$SMPROGRAMS\\\${COMPANYNAME}"
    CreateShortCut "$SMPROGRAMS\\\${COMPANYNAME}\\\${APPNAME}.lnk" "$INSTDIR\\\${APPNAME}.exe"
    CreateShortCut "$DESKTOP\\\${APPNAME}.lnk" "$INSTDIR\\\${APPNAME}.exe"
    
    ; Write uninstaller
    WriteUninstaller "$INSTDIR\\Uninstall.exe"
    
    ; Registry entries
    WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\\${APPNAME}" "DisplayName" "\${APPNAME}"
    WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\\${APPNAME}" "UninstallString" "$INSTDIR\\Uninstall.exe"
    WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\\${APPNAME}" "InstallLocation" "$INSTDIR"
    WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\\${APPNAME}" "Publisher" "\${COMPANYNAME}"
    WriteRegDWORD HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\\${APPNAME}" "NoModify" 1
    WriteRegDWORD HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\\${APPNAME}" "NoRepair" 1
SectionEnd

; Uninstaller section
Section "Uninstall"
    Delete "$INSTDIR\\Uninstall.exe"
    RMDir /r "$INSTDIR"
    
    Delete "$SMPROGRAMS\\\${COMPANYNAME}\\\${APPNAME}.lnk"
    Delete "$DESKTOP\\\${APPNAME}.lnk"
    RMDir "$SMPROGRAMS\\\${COMPANYNAME}"
    
    DeleteRegKey HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\\${APPNAME}"
SectionEnd
`;
    
    const scriptsDir = path.join(this.rootDir, 'scripts');
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(scriptsDir, 'installer.nsh'), nsisScript);
  }

  async createAutoUpdaterConfig() {
    const autoUpdaterConfig = {
      provider: 'github',
      owner: 'options-tutor',
      repo: 'options-tutor-app',
      private: false,
      releaseType: 'release'
    };
    
    fs.writeFileSync(
      path.join(this.distDir, 'app-update.yml'),
      `provider: github
owner: options-tutor
repo: options-tutor-app
updaterCacheDirName: options-tutor-updater`
    );
  }

  async generatePackageReport() {
    console.log('📊 Generating package report...');
    
    const releaseFiles = this.getAllFiles(this.releaseDir);
    const packageStats = releaseFiles.map(file => {
      const stats = fs.statSync(file);
      return {
        name: path.relative(this.releaseDir, file),
        size: stats.size,
        created: stats.birthtime
      };
    });
    
    const report = {
      timestamp: new Date().toISOString(),
      version: this.packageJson.version,
      platform: process.platform,
      arch: process.arch,
      packages: packageStats,
      totalSize: packageStats.reduce((sum, pkg) => sum + pkg.size, 0),
      packageCount: packageStats.length
    };
    
    fs.writeFileSync(
      path.join(this.releaseDir, 'package-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log('   📄 Package report saved to release/package-report.json');
    console.log(`   📦 Total package size: ${this.formatBytes(report.totalSize)}`);
    console.log(`   📁 Packages created: ${report.packageCount}`);
  }

  getAllFiles(dir) {
    let files = [];
    
    if (!fs.existsSync(dir)) {
      return files;
    }
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files = files.concat(this.getAllFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

// Run the packaging
if (require.main === module) {
  const packager = new AppPackager();
  packager.package().catch(error => {
    console.error('Application packaging failed:', error);
    process.exit(1);
  });
}

module.exports = AppPackager;