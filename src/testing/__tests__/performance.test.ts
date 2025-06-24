/**
 * Jest Performance Tests for Options Tutor
 * Integration with the main performance test suite
 */

import PerformanceTestSuite from '../PerformanceTestSuite';

// Increase timeout for performance tests
jest.setTimeout(300000); // 5 minutes

describe('Options Tutor Performance Tests', () => {
  let performanceTestSuite: PerformanceTestSuite;

  beforeAll(() => {
    performanceTestSuite = new PerformanceTestSuite();
  });

  describe('Load Testing', () => {
    test('should handle 10 positions with good performance', async () => {
      const metrics = await performanceTestSuite.runFullTestSuite();
      const loadTest = metrics.find(m => m.testName.includes('10 positions'));
      
      expect(loadTest).toBeDefined();
      expect(loadTest!.passed).toBe(true);
      expect(loadTest!.renderTime.max).toBeLessThan(100); // Under 100ms
      expect(loadTest!.errorRate).toBeLessThan(0.05); // Less than 5% errors
    });

    test('should handle 100 positions with acceptable performance', async () => {
      const metrics = await performanceTestSuite.runFullTestSuite();
      const loadTest = metrics.find(m => m.testName.includes('100 positions'));
      
      expect(loadTest).toBeDefined();
      expect(loadTest!.passed).toBe(true);
      expect(loadTest!.renderTime.max).toBeLessThan(150); // Under 150ms
      expect(loadTest!.memoryUsage.peak).toBeLessThan(200 * 1024 * 1024); // Under 200MB
    });

    test('should handle 500 positions without critical issues', async () => {
      const metrics = await performanceTestSuite.runFullTestSuite();
      const loadTest = metrics.find(m => m.testName.includes('500 positions'));
      
      expect(loadTest).toBeDefined();
      expect(loadTest!.renderTime.max).toBeLessThan(200); // Under 200ms
      expect(loadTest!.memoryUsage.peak).toBeLessThan(300 * 1024 * 1024); // Under 300MB
    });

    test('should handle 1000 positions in stress test', async () => {
      const metrics = await performanceTestSuite.runFullTestSuite();
      const stressTest = metrics.find(m => m.testName.includes('1000 positions'));
      
      expect(stressTest).toBeDefined();
      expect(stressTest!.renderTime.max).toBeLessThan(300); // Under 300ms
      expect(stressTest!.memoryUsage.peak).toBeLessThan(500 * 1024 * 1024); // Under 500MB
    });
  });

  describe('Memory Management', () => {
    test('should not have memory leaks', async () => {
      const metrics = await performanceTestSuite.runFullTestSuite();
      const memoryTest = metrics.find(m => m.testName.includes('Memory Leak'));
      
      expect(memoryTest).toBeDefined();
      expect(memoryTest!.passed).toBe(true);
    });

    test('should maintain efficient cache performance', async () => {
      const metrics = await performanceTestSuite.runFullTestSuite();
      const cacheTest = metrics.find(m => m.testName.includes('Cache Performance'));
      
      expect(cacheTest).toBeDefined();
      expect(cacheTest!.passed).toBe(true);
      expect(cacheTest!.cacheHitRate).toBeGreaterThan(0.8); // 80% hit rate
    });
  });

  describe('Real-Time Performance', () => {
    test('should handle real-time updates efficiently', async () => {
      const metrics = await performanceTestSuite.runFullTestSuite();
      const realTimeTest = metrics.find(m => m.testName.includes('Real-Time Update'));
      
      expect(realTimeTest).toBeDefined();
      expect(realTimeTest!.passed).toBe(true);
      expect(realTimeTest!.renderTime.max).toBeLessThan(100); // Under 100ms
      expect(realTimeTest!.errorRate).toBeLessThan(0.01); // Less than 1% errors
    });
  });

  describe('Stress Testing', () => {
    test('should survive extreme load conditions', async () => {
      const metrics = await performanceTestSuite.runFullTestSuite();
      const stressTest = metrics.find(m => m.testName.includes('Stress Test'));
      
      expect(stressTest).toBeDefined();
      // Stress test may fail but should not crash
      expect(stressTest!.duration).toBeGreaterThan(0);
      expect(stressTest!.memoryUsage.final).toBeGreaterThan(0);
    });
  });

  afterAll(() => {
    // Export metrics for analysis
    const metrics = performanceTestSuite.exportMetrics();
    console.log('Performance test metrics exported');
    
    // Clean up any test data
    if (global.gc) {
      global.gc();
    }
  });
});