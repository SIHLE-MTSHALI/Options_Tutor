#!/usr/bin/env node

/**
 * Production Build Script for Options Tutor
 * Handles complete production build process with optimization and validation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class ProductionBuilder {
  constructor() {
    this.rootDir = path.join(__dirname, '..');
    this.distDir = path.join(this.rootDir, 'dist');
    this.packageJson = require(path.join(this.rootDir, 'package.json'));
  }

  async build() {
    console.log('🚀 Starting Production Build for Options Tutor');
    console.log(`📦 Version: ${this.packageJson.version}`);
    console.log('=' .repeat(60));

    try {
      // Pre-build validation
      await this.preBuildValidation();
      
      // Clean previous builds
      await this.cleanBuild();
      
      // Type checking
      await this.typeCheck();
      
      // Build main process
      await this.buildMain();
      
      // Build renderer process
      await this.buildRenderer();
      
      // Post-build optimization
      await this.postBuildOptimization();
      
      // Validation
      await this.validateBuild();
      
      // Generate build report
      await this.generateBuildReport();
      
      console.log('\n✅ Production build completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Production build failed:', error.message);
      process.exit(1);
    }
  }

  async preBuildValidation() {
    console.log('🔍 Pre-build validation...');
    
    // Check Node.js version
    const nodeVersion = process.version;
    const requiredVersion = this.packageJson.engines?.node;
    if (requiredVersion && !this.satisfiesVersion(nodeVersion, requiredVersion)) {
      throw new Error(`Node.js version ${nodeVersion} does not satisfy requirement ${requiredVersion}`);
    }
    
    // Check required files
    const requiredFiles = [
      'src/index.tsx',
      'main.js',
      'preload.js',
      'public/index.html'
    ];
    
    for (const file of requiredFiles) {
      if (!fs.existsSync(path.join(this.rootDir, file))) {
        throw new Error(`Required file missing: ${file}`);
      }
    }
    
    // Check dependencies
    console.log('   Checking dependencies...');
    execSync('npm audit --audit-level=high', { stdio: 'pipe' });
    
    console.log('   ✅ Pre-build validation passed');
  }

  async cleanBuild() {
    console.log('🧹 Cleaning previous build...');
    
    if (fs.existsSync(this.distDir)) {
      fs.rmSync(this.distDir, { recursive: true, force: true });
    }
    
    // Clean other build artifacts
    const cleanPaths = [
      'build',
      'release',
      '*.tsbuildinfo'
    ];
    
    cleanPaths.forEach(pattern => {
      const fullPath = path.join(this.rootDir, pattern);
      if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      }
    });
    
    console.log('   ✅ Build cleaned');
  }

  async typeCheck() {
    console.log('🔍 Type checking...');
    
    try {
      execSync('npx tsc --noEmit --project tsconfig.production.json', { 
        stdio: 'pipe',
        cwd: this.rootDir
      });
      console.log('   ✅ Type checking passed');
    } catch (error) {
      console.error('   ❌ Type checking failed');
      throw new Error('TypeScript compilation errors detected');
    }
  }

  async buildMain() {
    console.log('⚙️ Building main process...');
    
    try {
      execSync('npx webpack --config webpack.main.config.js --mode production', {
        stdio: 'inherit',
        cwd: this.rootDir
      });
      console.log('   ✅ Main process built');
    } catch (error) {
      throw new Error('Main process build failed');
    }
  }

  async buildRenderer() {
    console.log('🎨 Building renderer process...');
    
    try {
      execSync('npx webpack --config webpack.production.config.js', {
        stdio: 'inherit',
        cwd: this.rootDir,
        env: { ...process.env, NODE_ENV: 'production' }
      });
      console.log('   ✅ Renderer process built');
    } catch (error) {
      throw new Error('Renderer process build failed');
    }
  }

  async postBuildOptimization() {
    console.log('⚡ Post-build optimization...');
    
    // Copy required files
    const filesToCopy = [
      { src: 'package.json', dest: 'package.json' },
      { src: 'preload.js', dest: 'preload.js' }
    ];
    
    filesToCopy.forEach(({ src, dest }) => {
      const srcPath = path.join(this.rootDir, src);
      const destPath = path.join(this.distDir, dest);
      
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
      }
    });
    
    // Create production package.json
    this.createProductionPackageJson();
    
    // Optimize assets
    await this.optimizeAssets();
    
    console.log('   ✅ Post-build optimization completed');
  }

  createProductionPackageJson() {
    const productionPackage = {
      name: this.packageJson.name,
      version: this.packageJson.version,
      description: this.packageJson.description,
      main: this.packageJson.main,
      author: this.packageJson.author,
      license: this.packageJson.license,
      homepage: this.packageJson.homepage,
      dependencies: this.filterProductionDependencies()
    };
    
    fs.writeFileSync(
      path.join(this.distDir, 'package.json'),
      JSON.stringify(productionPackage, null, 2)
    );
  }

  filterProductionDependencies() {
    const deps = this.packageJson.dependencies || {};
    const prodDeps = {};
    
    // Only include runtime dependencies
    const runtimeDeps = [
      'electron',
      '@reduxjs/toolkit',
      'react',
      'react-dom',
      'chart.js',
      'rxjs'
    ];
    
    runtimeDeps.forEach(dep => {
      if (deps[dep]) {
        prodDeps[dep] = deps[dep];
      }
    });
    
    return prodDeps;
  }

  async optimizeAssets() {
    console.log('   Optimizing assets...');
    
    // Compress images (if any optimization tools are available)
    // This would typically use tools like imagemin
    
    // Remove source maps in production
    const files = this.getAllFiles(this.distDir);
    files.forEach(file => {
      if (file.endsWith('.map')) {
        fs.unlinkSync(file);
      }
    });
  }

  async validateBuild() {
    console.log('✅ Validating build...');
    
    // Check required files exist
    const requiredFiles = [
      'index.html',
      'main.js',
      'preload.js',
      'package.json'
    ];
    
    requiredFiles.forEach(file => {
      const filePath = path.join(this.distDir, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Required build file missing: ${file}`);
      }
    });
    
    // Check bundle sizes
    const bundleStats = this.analyzeBundleSizes();
    
    // Validate bundle sizes
    if (bundleStats.totalSize > 100 * 1024 * 1024) { // 100MB
      console.warn('⚠️ Warning: Large bundle size detected');
    }
    
    if (bundleStats.mainBundle > 20 * 1024 * 1024) { // 20MB
      console.warn('⚠️ Warning: Large main bundle detected');
    }
    
    console.log(`   📦 Total bundle size: ${this.formatBytes(bundleStats.totalSize)}`);
    console.log('   ✅ Build validation passed');
  }

  analyzeBundleSizes() {
    const files = this.getAllFiles(this.distDir);
    let totalSize = 0;
    let mainBundle = 0;
    
    files.forEach(file => {
      const stats = fs.statSync(file);
      totalSize += stats.size;
      
      if (path.basename(file).includes('main') && file.endsWith('.js')) {
        mainBundle = stats.size;
      }
    });
    
    return { totalSize, mainBundle };
  }

  async generateBuildReport() {
    console.log('📊 Generating build report...');
    
    const bundleStats = this.analyzeBundleSizes();
    const files = this.getAllFiles(this.distDir);
    
    const report = {
      timestamp: new Date().toISOString(),
      version: this.packageJson.version,
      nodeVersion: process.version,
      platform: process.platform,
      bundleStats,
      files: files.map(file => ({
        name: path.relative(this.distDir, file),
        size: fs.statSync(file).size,
        type: path.extname(file)
      })).sort((a, b) => b.size - a.size),
      buildTime: Date.now() - this.buildStartTime
    };
    
    fs.writeFileSync(
      path.join(this.distDir, 'build-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log('   📄 Build report saved to dist/build-report.json');
  }

  getAllFiles(dir) {
    let files = [];
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

  satisfiesVersion(current, required) {
    // Simple version check - in production, use semver library
    const currentMajor = parseInt(current.split('.')[0].replace('v', ''));
    const requiredMajor = parseInt(required.split('.')[0].replace('>=', '').replace('v', ''));
    return currentMajor >= requiredMajor;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

// Run the production build
if (require.main === module) {
  const builder = new ProductionBuilder();
  builder.buildStartTime = Date.now();
  builder.build().catch(error => {
    console.error('Production build failed:', error);
    process.exit(1);
  });
}

module.exports = ProductionBuilder;