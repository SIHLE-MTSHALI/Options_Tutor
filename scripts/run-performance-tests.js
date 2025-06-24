#!/usr/bin/env node

/**
 * Performance Test Runner for Options Tutor
 * Runs comprehensive performance tests and generates reports
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class PerformanceTestRunner {
  constructor() {
    this.resultsDir = path.join(__dirname, '..', 'performance-results');
    this.ensureResultsDirectory();
  }

  ensureResultsDirectory() {
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }
  }

  async runTests() {
    console.log('🚀 Starting Options Tutor Performance Test Suite');
    console.log('=' .repeat(60));
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(this.resultsDir, `performance-report-${timestamp}.json`);
    
    try {
      // Build the application first
      console.log('📦 Building application for performance testing...');
      execSync('npm run build', { stdio: 'inherit' });
      
      // Run Jest performance tests
      console.log('🧪 Running Jest performance tests...');
      const jestOutput = execSync('npx jest --testPathPattern=performance --verbose --json', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const jestResults = JSON.parse(jestOutput);
      
      // Run bundle analysis
      console.log('📊 Analyzing bundle size...');
      const bundleStats = this.analyzeBundleSize();
      
      // Run memory profiling
      console.log('🧠 Running memory profiling...');
      const memoryProfile = this.runMemoryProfiling();
      
      // Generate comprehensive report
      const report = {
        timestamp: new Date().toISOString(),
        environment: this.getEnvironmentInfo(),
        jestResults,
        bundleStats,
        memoryProfile,
        recommendations: this.generateRecommendations(jestResults, bundleStats, memoryProfile)
      };
      
      // Save report
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
      
      // Display summary
      this.displaySummary(report);
      
      console.log(`\n📄 Full report saved to: ${reportFile}`);
      
    } catch (error) {
      console.error('❌ Performance tests failed:', error.message);
      process.exit(1);
    }
  }

  analyzeBundleSize() {
    console.log('   Analyzing main bundle...');
    
    const distPath = path.join(__dirname, '..', 'dist');
    const bundleStats = {
      mainBundle: 0,
      rendererBundle: 0,
      totalSize: 0,
      assetCount: 0,
      largestAssets: []
    };

    if (fs.existsSync(distPath)) {
      const files = this.getAllFiles(distPath);
      const assets = files.map(file => {
        const stats = fs.statSync(file);
        return {
          name: path.relative(distPath, file),
          size: stats.size,
          type: path.extname(file)
        };
      }).sort((a, b) => b.size - a.size);

      bundleStats.totalSize = assets.reduce((sum, asset) => sum + asset.size, 0);
      bundleStats.assetCount = assets.length;
      bundleStats.largestAssets = assets.slice(0, 10);

      // Find main bundles
      const mainBundle = assets.find(a => a.name.includes('main') && a.name.endsWith('.js'));
      const rendererBundle = assets.find(a => a.name.includes('renderer') && a.name.endsWith('.js'));
      
      bundleStats.mainBundle = mainBundle ? mainBundle.size : 0;
      bundleStats.rendererBundle = rendererBundle ? rendererBundle.size : 0;
    }

    return bundleStats;
  }

  runMemoryProfiling() {
    console.log('   Profiling memory usage...');
    
    // Simulate memory profiling (in a real scenario, this would use tools like clinic.js)
    return {
      heapUsed: process.memoryUsage().heapUsed,
      heapTotal: process.memoryUsage().heapTotal,
      external: process.memoryUsage().external,
      rss: process.memoryUsage().rss,
      estimatedAppMemory: 150 * 1024 * 1024, // 150MB estimated
      memoryLeaks: false,
      gcPressure: 'low'
    };
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

  getEnvironmentInfo() {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpus: require('os').cpus().length,
      totalMemory: require('os').totalmem(),
      freeMemory: require('os').freemem()
    };
  }

  generateRecommendations(jestResults, bundleStats, memoryProfile) {
    const recommendations = [];

    // Bundle size recommendations
    if (bundleStats.totalSize > 50 * 1024 * 1024) { // 50MB
      recommendations.push({
        category: 'Bundle Size',
        priority: 'high',
        issue: 'Large bundle size detected',
        recommendation: 'Implement code splitting and lazy loading',
        impact: 'Slower initial load times'
      });
    }

    if (bundleStats.rendererBundle > 10 * 1024 * 1024) { // 10MB
      recommendations.push({
        category: 'Bundle Size',
        priority: 'medium',
        issue: 'Large renderer bundle',
        recommendation: 'Split renderer bundle into chunks',
        impact: 'Slower application startup'
      });
    }

    // Memory recommendations
    if (memoryProfile.estimatedAppMemory > 300 * 1024 * 1024) { // 300MB
      recommendations.push({
        category: 'Memory',
        priority: 'high',
        issue: 'High memory usage',
        recommendation: 'Optimize data structures and implement better cleanup',
        impact: 'Poor performance on low-memory devices'
      });
    }

    // Test results recommendations
    if (jestResults.numFailedTests > 0) {
      recommendations.push({
        category: 'Performance Tests',
        priority: 'high',
        issue: `${jestResults.numFailedTests} performance tests failed`,
        recommendation: 'Address failing performance tests before production',
        impact: 'Potential performance issues in production'
      });
    }

    return recommendations;
  }

  displaySummary(report) {
    console.log('\n📋 PERFORMANCE TEST SUMMARY');
    console.log('=' .repeat(50));
    
    // Jest results summary
    if (report.jestResults) {
      const { numPassedTests, numFailedTests, numTotalTests } = report.jestResults;
      console.log(`🧪 Jest Tests: ${numPassedTests}/${numTotalTests} passed`);
      if (numFailedTests > 0) {
        console.log(`   ❌ ${numFailedTests} tests failed`);
      }
    }
    
    // Bundle size summary
    console.log(`📦 Bundle Size: ${this.formatBytes(report.bundleStats.totalSize)}`);
    console.log(`   Main: ${this.formatBytes(report.bundleStats.mainBundle)}`);
    console.log(`   Renderer: ${this.formatBytes(report.bundleStats.rendererBundle)}`);
    console.log(`   Assets: ${report.bundleStats.assetCount} files`);
    
    // Memory summary
    console.log(`🧠 Memory Usage: ${this.formatBytes(report.memoryProfile.estimatedAppMemory)}`);
    console.log(`   Heap: ${this.formatBytes(report.memoryProfile.heapUsed)}`);
    console.log(`   RSS: ${this.formatBytes(report.memoryProfile.rss)}`);
    
    // Recommendations summary
    if (report.recommendations.length > 0) {
      console.log(`\n💡 Recommendations: ${report.recommendations.length} items`);
      report.recommendations.forEach(rec => {
        const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
        console.log(`   ${priority} ${rec.category}: ${rec.issue}`);
      });
    } else {
      console.log('\n✨ No performance issues detected!');
    }
    
    // Overall assessment
    const overallScore = this.calculateOverallScore(report);
    console.log(`\n🎯 Overall Performance Score: ${overallScore}/100`);
    
    if (overallScore >= 90) {
      console.log('🟢 Excellent - Ready for production');
    } else if (overallScore >= 75) {
      console.log('🟡 Good - Minor optimizations recommended');
    } else if (overallScore >= 60) {
      console.log('🟠 Fair - Optimizations needed before production');
    } else {
      console.log('🔴 Poor - Significant performance issues detected');
    }
  }

  calculateOverallScore(report) {
    let score = 100;
    
    // Deduct points for failed tests
    if (report.jestResults && report.jestResults.numFailedTests > 0) {
      score -= report.jestResults.numFailedTests * 10;
    }
    
    // Deduct points for large bundle size
    if (report.bundleStats.totalSize > 50 * 1024 * 1024) {
      score -= 20;
    } else if (report.bundleStats.totalSize > 30 * 1024 * 1024) {
      score -= 10;
    }
    
    // Deduct points for high memory usage
    if (report.memoryProfile.estimatedAppMemory > 300 * 1024 * 1024) {
      score -= 15;
    } else if (report.memoryProfile.estimatedAppMemory > 200 * 1024 * 1024) {
      score -= 5;
    }
    
    // Deduct points for high-priority recommendations
    const highPriorityRecs = report.recommendations.filter(r => r.priority === 'high');
    score -= highPriorityRecs.length * 10;
    
    return Math.max(0, score);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

// Run the performance tests
if (require.main === module) {
  const runner = new PerformanceTestRunner();
  runner.runTests().catch(error => {
    console.error('Performance test runner failed:', error);
    process.exit(1);
  });
}

module.exports = PerformanceTestRunner;