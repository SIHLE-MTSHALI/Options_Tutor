/**
 * Performance Testing Suite for Options Tutor
 * Comprehensive testing for load, stress, and optimization validation
 */

import { store } from '../redux/store';
import { addPosition } from '../redux/portfolioSlice';
import { OptimizedRealTimePLService } from '../services/OptimizedRealTimePLService';
import { OptimizedRealTimeService } from '../services/OptimizedRealTimeService';
import { Position } from '../redux/types';

interface PerformanceMetrics {
  testName: string;
  duration: number;
  memoryUsage: {
    initial: number;
    peak: number;
    final: number;
  };
  renderTime: {
    average: number;
    max: number;
    min: number;
  };
  updateFrequency: number;
  cacheHitRate?: number;
  errorRate: number;
  passed: boolean;
}

interface LoadTestConfig {
  positionCount: number;
  updateFrequency: number;
  testDuration: number; // milliseconds
  expectedMaxRenderTime: number;
  expectedMaxMemoryUsage: number;
}

export class PerformanceTestSuite {
  private metrics: PerformanceMetrics[] = [];
  private realTimePLService: OptimizedRealTimePLService;
  private realTimeService: OptimizedRealTimeService;

  constructor() {
    this.realTimePLService = OptimizedRealTimePLService.getInstance();
    this.realTimeService = OptimizedRealTimeService.getInstance();
  }

  /**
   * Run comprehensive performance test suite
   */
  public async runFullTestSuite(): Promise<PerformanceMetrics[]> {
    console.log('🚀 Starting Performance Test Suite...');
    
    const testConfigs: LoadTestConfig[] = [
      {
        positionCount: 10,
        updateFrequency: 1000,
        testDuration: 30000,
        expectedMaxRenderTime: 100,
        expectedMaxMemoryUsage: 100 * 1024 * 1024 // 100MB
      },
      {
        positionCount: 100,
        updateFrequency: 1000,
        testDuration: 60000,
        expectedMaxRenderTime: 150,
        expectedMaxMemoryUsage: 200 * 1024 * 1024 // 200MB
      },
      {
        positionCount: 500,
        updateFrequency: 2000,
        testDuration: 60000,
        expectedMaxRenderTime: 200,
        expectedMaxMemoryUsage: 300 * 1024 * 1024 // 300MB
      },
      {
        positionCount: 1000,
        updateFrequency: 5000,
        testDuration: 120000,
        expectedMaxRenderTime: 300,
        expectedMaxMemoryUsage: 500 * 1024 * 1024 // 500MB
      }
    ];

    // Run load tests
    for (const config of testConfigs) {
      const metrics = await this.runLoadTest(config);
      this.metrics.push(metrics);
    }

    // Run stress tests
    await this.runStressTest();
    
    // Run memory leak tests
    await this.runMemoryLeakTest();
    
    // Run cache performance tests
    await this.runCachePerformanceTest();
    
    // Run real-time update tests
    await this.runRealTimeUpdateTest();

    // Generate performance report
    this.generatePerformanceReport();

    return this.metrics;
  }

  /**
   * Load testing with varying position counts
   */
  private async runLoadTest(config: LoadTestConfig): Promise<PerformanceMetrics> {
    console.log(`📊 Running load test: ${config.positionCount} positions`);
    
    const testName = `Load Test - ${config.positionCount} positions`;
    const startTime = performance.now();
    const initialMemory = this.getMemoryUsage();
    
    let peakMemory = initialMemory;
    let renderTimes: number[] = [];
    let errorCount = 0;
    let updateCount = 0;

    try {
      // Create test positions
      const positions = this.generateTestPositions(config.positionCount);
      
      // Add positions to store
      positions.forEach(position => {
        store.dispatch(addPosition(position));
      });

      // Start real-time services
      this.realTimePLService.start(config.updateFrequency);

      // Monitor performance during test
      const monitoringInterval = setInterval(() => {
        const renderStart = performance.now();
        
        // Simulate UI update
        this.simulateUIUpdate();
        
        const renderEnd = performance.now();
        const renderTime = renderEnd - renderStart;
        renderTimes.push(renderTime);
        
        // Track memory usage
        const currentMemory = this.getMemoryUsage();
        if (currentMemory > peakMemory) {
          peakMemory = currentMemory;
        }
        
        updateCount++;
        
        // Check for performance degradation
        if (renderTime > config.expectedMaxRenderTime) {
          errorCount++;
        }
      }, 100); // Monitor every 100ms

      // Run test for specified duration
      await this.sleep(config.testDuration);
      
      // Stop monitoring
      clearInterval(monitoringInterval);
      this.realTimePLService.stop();

    } catch (error) {
      console.error('Load test error:', error);
      errorCount++;
    }

    const endTime = performance.now();
    const finalMemory = this.getMemoryUsage();
    
    const metrics: PerformanceMetrics = {
      testName,
      duration: endTime - startTime,
      memoryUsage: {
        initial: initialMemory,
        peak: peakMemory,
        final: finalMemory
      },
      renderTime: {
        average: renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length,
        max: Math.max(...renderTimes),
        min: Math.min(...renderTimes)
      },
      updateFrequency: updateCount / (config.testDuration / 1000),
      errorRate: errorCount / updateCount,
      passed: peakMemory < config.expectedMaxMemoryUsage && 
              Math.max(...renderTimes) < config.expectedMaxRenderTime &&
              errorCount / updateCount < 0.05 // Less than 5% error rate
    };

    console.log(`✅ Load test completed: ${metrics.passed ? 'PASSED' : 'FAILED'}`);
    return metrics;
  }

  /**
   * Stress testing with extreme conditions
   */
  private async runStressTest(): Promise<void> {
    console.log('🔥 Running stress test...');
    
    const stressConfig: LoadTestConfig = {
      positionCount: 2000,
      updateFrequency: 100, // Very frequent updates
      testDuration: 60000,
      expectedMaxRenderTime: 500,
      expectedMaxMemoryUsage: 1024 * 1024 * 1024 // 1GB
    };

    const metrics = await this.runLoadTest(stressConfig);
    metrics.testName = 'Stress Test - Extreme Load';
    this.metrics.push(metrics);
  }

  /**
   * Memory leak detection test
   */
  private async runMemoryLeakTest(): Promise<void> {
    console.log('🔍 Running memory leak test...');
    
    const testName = 'Memory Leak Test';
    const startTime = performance.now();
    const initialMemory = this.getMemoryUsage();
    
    let memoryReadings: number[] = [];
    
    // Run multiple cycles of position creation/destruction
    for (let cycle = 0; cycle < 10; cycle++) {
      // Create positions
      const positions = this.generateTestPositions(100);
      positions.forEach(position => {
        store.dispatch(addPosition(position));
      });
      
      // Start services
      this.realTimePLService.start(1000);
      await this.sleep(5000);
      
      // Stop services and clear
      this.realTimePLService.stop();
      this.realTimePLService.clearCaches();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Record memory usage
      memoryReadings.push(this.getMemoryUsage());
      await this.sleep(1000);
    }
    
    const endTime = performance.now();
    const finalMemory = this.getMemoryUsage();
    
    // Check for memory leaks (memory should not continuously increase)
    const memoryTrend = this.calculateMemoryTrend(memoryReadings);
    const hasMemoryLeak = memoryTrend > 1024 * 1024; // More than 1MB increase per cycle
    
    const metrics: PerformanceMetrics = {
      testName,
      duration: endTime - startTime,
      memoryUsage: {
        initial: initialMemory,
        peak: Math.max(...memoryReadings),
        final: finalMemory
      },
      renderTime: { average: 0, max: 0, min: 0 },
      updateFrequency: 0,
      errorRate: 0,
      passed: !hasMemoryLeak
    };
    
    console.log(`🔍 Memory leak test: ${metrics.passed ? 'NO LEAKS DETECTED' : 'POTENTIAL LEAK DETECTED'}`);
    this.metrics.push(metrics);
  }

  /**
   * Cache performance testing
   */
  private async runCachePerformanceTest(): Promise<void> {
    console.log('💾 Running cache performance test...');
    
    const testName = 'Cache Performance Test';
    const startTime = performance.now();
    const initialMemory = this.getMemoryUsage();
    
    // Test cache hit rates with repeated data access
    const positions = this.generateTestPositions(100);
    positions.forEach(position => {
      store.dispatch(addPosition(position));
    });
    
    this.realTimePLService.start(500);
    
    // Let cache warm up
    await this.sleep(10000);
    
    // Get performance metrics from optimized service
    const serviceMetrics = this.realTimePLService.getPerformanceMetrics();
    
    this.realTimePLService.stop();
    
    const endTime = performance.now();
    const finalMemory = this.getMemoryUsage();
    
    const metrics: PerformanceMetrics = {
      testName,
      duration: endTime - startTime,
      memoryUsage: {
        initial: initialMemory,
        peak: finalMemory,
        final: finalMemory
      },
      renderTime: {
        average: serviceMetrics.averageUpdateTime,
        max: serviceMetrics.maxUpdateTime,
        min: 0
      },
      updateFrequency: 0,
      cacheHitRate: serviceMetrics.cacheHitRate,
      errorRate: 0,
      passed: serviceMetrics.cacheHitRate > 0.8 && // 80% cache hit rate
              serviceMetrics.averageUpdateTime < 50 // Under 50ms average
    };
    
    console.log(`💾 Cache test: ${metrics.passed ? 'PASSED' : 'FAILED'} (Hit rate: ${(serviceMetrics.cacheHitRate * 100).toFixed(1)}%)`);
    this.metrics.push(metrics);
  }

  /**
   * Real-time update performance test
   */
  private async runRealTimeUpdateTest(): Promise<void> {
    console.log('⚡ Running real-time update test...');
    
    const testName = 'Real-Time Update Test';
    const startTime = performance.now();
    const initialMemory = this.getMemoryUsage();
    
    let updateTimes: number[] = [];
    let errorCount = 0;
    
    // Create positions
    const positions = this.generateTestPositions(50);
    positions.forEach(position => {
      store.dispatch(addPosition(position));
    });
    
    // Monitor update performance
    const updateMonitor = setInterval(() => {
      const updateStart = performance.now();
      
      try {
        // Simulate real-time price update
        this.simulatePriceUpdate();
        
        const updateEnd = performance.now();
        updateTimes.push(updateEnd - updateStart);
      } catch (error) {
        errorCount++;
      }
    }, 100);
    
    // Run for 30 seconds
    await this.sleep(30000);
    clearInterval(updateMonitor);
    
    const endTime = performance.now();
    const finalMemory = this.getMemoryUsage();
    
    const metrics: PerformanceMetrics = {
      testName,
      duration: endTime - startTime,
      memoryUsage: {
        initial: initialMemory,
        peak: finalMemory,
        final: finalMemory
      },
      renderTime: {
        average: updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length,
        max: Math.max(...updateTimes),
        min: Math.min(...updateTimes)
      },
      updateFrequency: updateTimes.length / 30,
      errorRate: errorCount / updateTimes.length,
      passed: Math.max(...updateTimes) < 100 && // Under 100ms max update time
              errorCount / updateTimes.length < 0.01 // Less than 1% error rate
    };
    
    console.log(`⚡ Real-time test: ${metrics.passed ? 'PASSED' : 'FAILED'}`);
    this.metrics.push(metrics);
  }

  /**
   * Generate test positions for load testing
   */
  private generateTestPositions(count: number): Position[] {
    const symbols = ['MSTY', 'PLTY', 'TSLY', 'SPY', 'QQQ', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];
    const positions: Position[] = [];
    
    for (let i = 0; i < count; i++) {
      const symbol = symbols[i % symbols.length];
      const position: Position = {
        id: `test-position-${i}`,
        symbol: `${symbol}-${Math.floor(i / symbols.length)}`,
        type: Math.random() > 0.5 ? 'call' : 'put',
        positionType: Math.random() > 0.5 ? 'long' : 'short',
        quantity: Math.floor(Math.random() * 10) + 1,
        strike: 100 + Math.random() * 50,
        expiry: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        purchasePrice: 50 + Math.random() * 100,
        currentPrice: 50 + Math.random() * 100,
        stopLoss: undefined,
        takeProfit: undefined,
        unrealizedPL: (Math.random() - 0.5) * 1000,
        lastUpdated: new Date().toISOString(),
        strategyId: undefined
      };
      positions.push(position);
    }
    
    return positions;
  }

  /**
   * Simulate UI update for performance testing
   */
  private simulateUIUpdate(): void {
    // Simulate DOM manipulation and React rendering
    const start = performance.now();
    
    // Simulate heavy computation
    let sum = 0;
    for (let i = 0; i < 10000; i++) {
      sum += Math.random();
    }
    
    // Simulate DOM access
    if (typeof document !== 'undefined') {
      const elements = document.querySelectorAll('div');
      elements.forEach(el => {
        el.style.opacity = '1';
      });
    }
  }

  /**
   * Simulate price update for real-time testing
   */
  private simulatePriceUpdate(): void {
    const state = store.getState();
    const positions = state.portfolio.positions;
    
    if (positions.length > 0) {
      const randomPosition = positions[Math.floor(Math.random() * positions.length)];
      const newPrice = randomPosition.currentPrice * (0.95 + Math.random() * 0.1);
      
      // Trigger price update through service
      this.realTimePLService.forceUpdate();
    }
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Calculate memory trend to detect leaks
   */
  private calculateMemoryTrend(readings: number[]): number {
    if (readings.length < 2) return 0;
    
    const firstHalf = readings.slice(0, Math.floor(readings.length / 2));
    const secondHalf = readings.slice(Math.floor(readings.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    return secondAvg - firstAvg;
  }

  /**
   * Sleep utility for async testing
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate comprehensive performance report
   */
  private generatePerformanceReport(): void {
    console.log('\n📋 PERFORMANCE TEST REPORT');
    console.log('=' .repeat(50));
    
    const passedTests = this.metrics.filter(m => m.passed).length;
    const totalTests = this.metrics.length;
    
    console.log(`Overall Result: ${passedTests}/${totalTests} tests passed`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);
    
    this.metrics.forEach(metric => {
      console.log(`${metric.passed ? '✅' : '❌'} ${metric.testName}`);
      console.log(`   Duration: ${metric.duration.toFixed(0)}ms`);
      console.log(`   Memory: ${this.formatBytes(metric.memoryUsage.initial)} → ${this.formatBytes(metric.memoryUsage.peak)} → ${this.formatBytes(metric.memoryUsage.final)}`);
      console.log(`   Render Time: ${metric.renderTime.average.toFixed(1)}ms avg, ${metric.renderTime.max.toFixed(1)}ms max`);
      if (metric.cacheHitRate !== undefined) {
        console.log(`   Cache Hit Rate: ${(metric.cacheHitRate * 100).toFixed(1)}%`);
      }
      console.log(`   Error Rate: ${(metric.errorRate * 100).toFixed(2)}%`);
      console.log('');
    });
    
    // Performance recommendations
    this.generateRecommendations();
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(): void {
    console.log('💡 PERFORMANCE RECOMMENDATIONS');
    console.log('=' .repeat(50));
    
    const failedTests = this.metrics.filter(m => !m.passed);
    
    if (failedTests.length === 0) {
      console.log('✨ All performance tests passed! The application is ready for production.');
      return;
    }
    
    failedTests.forEach(test => {
      console.log(`❌ ${test.testName} - Issues Found:`);
      
      if (test.renderTime.max > 200) {
        console.log('   • Consider implementing virtual scrolling for large lists');
        console.log('   • Optimize React rendering with useMemo and useCallback');
        console.log('   • Implement component lazy loading');
      }
      
      if (test.memoryUsage.peak > 500 * 1024 * 1024) {
        console.log('   • Memory usage is high - implement better cleanup');
        console.log('   • Consider reducing cache size limits');
        console.log('   • Check for memory leaks in subscriptions');
      }
      
      if (test.errorRate > 0.05) {
        console.log('   • High error rate detected - improve error handling');
        console.log('   • Add more defensive programming practices');
        console.log('   • Implement better validation');
      }
      
      if (test.cacheHitRate && test.cacheHitRate < 0.8) {
        console.log('   • Cache hit rate is low - optimize caching strategy');
        console.log('   • Consider increasing cache size');
        console.log('   • Review cache eviction policies');
      }
      
      console.log('');
    });
  }

  /**
   * Format bytes for human-readable output
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Export metrics to JSON for analysis
   */
  public exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2);
  }
}

// Export for use in tests
export default PerformanceTestSuite;