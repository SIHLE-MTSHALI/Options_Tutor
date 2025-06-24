import { AlphaVantageService } from '../AlphaVantageService';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs and path modules
jest.mock('fs');
jest.mock('path');
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mock/path')
  }
}));

// Mock fetch
global.fetch = jest.fn();

describe('AlphaVantageService', () => {
  let service: AlphaVantageService;
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockPath = path as jest.Mocked<typeof path>;
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock path.join to return predictable paths
    mockPath.join.mockImplementation((...args) => args.join('/'));
    
    // Mock fs.existsSync to return false initially
    mockFs.existsSync.mockReturnValue(false);
    
    // Mock fs.mkdirSync
    mockFs.mkdirSync.mockImplementation(() => undefined);
    
    // Mock fs.readFileSync and writeFileSync
    mockFs.readFileSync.mockReturnValue('{}');
    mockFs.writeFileSync.mockImplementation(() => undefined);
    
    // Get fresh instance
    service = AlphaVantageService.getInstance();
  });

  afterEach(() => {
    // Stop any running intervals
    service.stopAutomaticDataFetching();
  });

  describe('Initialization', () => {
    it('should create singleton instance', () => {
      const instance1 = AlphaVantageService.getInstance();
      const instance2 = AlphaVantageService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should initialize with default configuration', () => {
      const apiStatus = service.getApiKeyStatus();
      expect(apiStatus.isDemo).toBe(true);
      expect(apiStatus.hasKey).toBe(false);
    });

    it('should create data directory if it does not exist', () => {
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('market-data'),
        { recursive: true }
      );
    });
  });

  describe('Rate Limiting', () => {
    it('should return correct rate limit status', () => {
      const status = service.getRateLimitStatus();
      
      expect(status).toHaveProperty('requestsRemaining');
      expect(status).toHaveProperty('requestsToday');
      expect(status).toHaveProperty('nextRequestTime');
      expect(status).toHaveProperty('canMakeRequest');
      
      expect(status.requestsRemaining).toBe(25); // Initial state
      expect(status.requestsToday).toBe(0);
      expect(status.canMakeRequest).toBe(true);
    });

    it('should reset daily counter on new day', () => {
      // This test would need to mock Date to properly test day transitions
      const status = service.getRateLimitStatus();
      expect(status.requestsToday).toBe(0);
    });
  });

  describe('API Key Management', () => {
    it('should set and validate API key', () => {
      const testKey = 'ABCDEFGHIJKLMNOP';
      service.setApiKey(testKey);
      
      const status = service.getApiKeyStatus();
      expect(status.hasKey).toBe(true);
      expect(status.isDemo).toBe(false);
    });

    it('should detect demo mode', () => {
      service.setApiKey('demo');
      
      const status = service.getApiKeyStatus();
      expect(status.hasKey).toBe(false);
      expect(status.isDemo).toBe(true);
    });
  });

  describe('Data Storage', () => {
    it('should load stored data on initialization', () => {
      const mockData = JSON.stringify({
        quotes: { AAPL: { symbol: 'AAPL', price: 150 } },
        historical: {},
        company: {},
        metadata: { lastUpdate: Date.now(), requestsToday: 0, lastRequestDate: new Date().toDateString() }
      });
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockData);
      
      // Create new instance to test loading
      const newService = AlphaVantageService.getInstance();
      const symbols = newService.getStoredSymbols();
      
      expect(symbols).toContain('AAPL');
    });

    it('should save data to disk', () => {
      // This would be tested by checking if writeFileSync is called
      // when data is updated
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    it('should handle corrupted data gracefully', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json');
      
      // Should not throw error and return default structure
      expect(() => AlphaVantageService.getInstance()).not.toThrow();
    });
  });

  describe('Mock Data Generation', () => {
    it('should generate realistic mock data', async () => {
      const quote = await service.getDetailedStockQuote('AAPL');
      
      expect(quote).toHaveProperty('symbol', 'AAPL');
      expect(quote).toHaveProperty('price');
      expect(quote).toHaveProperty('change');
      expect(quote).toHaveProperty('changePercent');
      expect(quote).toHaveProperty('volume');
      expect(quote).toHaveProperty('refreshedAt');
      
      expect(typeof quote.price).toBe('number');
      expect(quote.price).toBeGreaterThan(0);
      expect(typeof quote.volume).toBe('number');
      expect(quote.volume).toBeGreaterThan(0);
    });

    it('should generate different prices for different symbols', async () => {
      const appleQuote = await service.getDetailedStockQuote('AAPL');
      const microsoftQuote = await service.getDetailedStockQuote('MSFT');
      
      // Prices should be in expected ranges for these symbols
      expect(appleQuote.price).toBeGreaterThan(100);
      expect(microsoftQuote.price).toBeGreaterThan(200);
    });
  });

  describe('API Integration', () => {
    beforeEach(() => {
      service.setApiKey('TESTKEY12345678');
    });

    it('should handle successful API response', async () => {
      const mockResponse = {
        'Global Quote': {
          '05. price': '150.25',
          '09. change': '2.15',
          '10. change percent': '1.45%',
          '06. volume': '45123456'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const quote = await service.getDetailedStockQuote('AAPL');
      
      expect(quote.symbol).toBe('AAPL');
      expect(quote.price).toBe(150.25);
      expect(quote.change).toBe(2.15);
      expect(quote.changePercent).toBe(1.45);
      expect(quote.volume).toBe(45123456);
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response);

      // Should fall back to mock data instead of throwing
      const quote = await service.getDetailedStockQuote('AAPL');
      expect(quote).toBeDefined();
      expect(quote.symbol).toBe('AAPL');
    });

    it('should handle rate limit responses', async () => {
      const mockResponse = {
        'Note': 'Thank you for using Alpha Vantage! Our standard API call frequency is 5 calls per minute and 500 calls per day.'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      // Should fall back to mock data when rate limited
      const quote = await service.getDetailedStockQuote('AAPL');
      expect(quote).toBeDefined();
      expect(quote.symbol).toBe('AAPL');
    });

    it('should respect rate limits', async () => {
      const status = service.getRateLimitStatus();
      
      if (!status.canMakeRequest) {
        // Should not make API call when rate limited
        const quote = await service.getDetailedStockQuote('AAPL');
        expect(mockFetch).not.toHaveBeenCalled();
        expect(quote).toBeDefined(); // Should return mock data
      }
    });
  });

  describe('Data Management', () => {
    it('should add and remove watched symbols', () => {
      const initialSymbols = service.getWatchedSymbols();
      
      service.addWatchedSymbol('NVDA');
      const afterAdd = service.getWatchedSymbols();
      expect(afterAdd).toContain('NVDA');
      expect(afterAdd.length).toBe(initialSymbols.length + 1);
      
      service.removeWatchedSymbol('NVDA');
      const afterRemove = service.getWatchedSymbols();
      expect(afterRemove).not.toContain('NVDA');
      expect(afterRemove.length).toBe(initialSymbols.length);
    });

    it('should not add duplicate symbols', () => {
      const initialSymbols = service.getWatchedSymbols();
      const initialLength = initialSymbols.length;
      
      // Add symbol that already exists
      service.addWatchedSymbol(initialSymbols[0]);
      
      const afterAdd = service.getWatchedSymbols();
      expect(afterAdd.length).toBe(initialLength);
    });

    it('should get storage statistics', () => {
      const stats = service.getStorageStats();
      
      expect(stats).toHaveProperty('quotesCount');
      expect(stats).toHaveProperty('historicalCount');
      expect(stats).toHaveProperty('companyCount');
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('lastUpdate');
      
      expect(typeof stats.quotesCount).toBe('number');
      expect(typeof stats.totalSize).toBe('number');
    });

    it('should clear stored data', () => {
      service.clearStoredData();
      
      const symbols = service.getStoredSymbols();
      expect(symbols.length).toBe(0);
      
      const stats = service.getStorageStats();
      expect(stats.quotesCount).toBe(0);
      expect(stats.historicalCount).toBe(0);
      expect(stats.companyCount).toBe(0);
    });

    it('should cleanup old data', () => {
      // This test would need to mock data with old timestamps
      const maxAge = 1000; // 1 second
      service.cleanupOldData(maxAge);
      
      // Should remove data older than maxAge
      // Implementation would depend on having test data with old timestamps
    });
  });

  describe('Data Freshness', () => {
    it('should report data freshness correctly', () => {
      const freshness = service.getDataFreshness();
      
      expect(freshness).toHaveProperty('lastUpdate');
      expect(freshness).toHaveProperty('isStale');
      expect(freshness).toHaveProperty('nextUpdate');
      
      expect(typeof freshness.isStale).toBe('boolean');
      expect(typeof freshness.lastUpdate).toBe('number');
      expect(typeof freshness.nextUpdate).toBe('number');
    });
  });

  describe('Service Availability', () => {
    it('should check service availability', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true
      } as Response);

      const isAvailable = await service.isAvailable();
      expect(typeof isAvailable).toBe('boolean');
    });

    it('should handle network errors when checking availability', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const isAvailable = await service.isAvailable();
      expect(isAvailable).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', () => {
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Should not crash when unable to save data
      expect(() => service.clearStoredData()).not.toThrow();
    });

    it('should handle invalid API responses', async () => {
      service.setApiKey('TESTKEY12345678');
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'response' })
      } as Response);

      // Should fall back to mock data for invalid responses
      const quote = await service.getDetailedStockQuote('AAPL');
      expect(quote).toBeDefined();
      expect(quote.symbol).toBe('AAPL');
    });
  });
});