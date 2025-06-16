import { HistoricalDataService } from '../historicalDataService';
import { DataFetchError } from '../errors/DataFetchError';
import { OptionChain } from '../../redux/marketDataSlice';

// Mock fetch
global.fetch = jest.fn() as jest.Mock;

describe('HistoricalDataService', () => {
  const mockApiResponse = {
    calls: [
      {
        strike: '150',
        'last price': '1.50',
        bid: '1.45',
        ask: '1.55',
        volume: '100',
        'open interest': '200',
        'implied volatility': '0.30',
        expiration: '2023-12-15'
      }
    ],
    puts: [
      {
        strike: '150',
        'last price': '1.60',
        bid: '1.55',
        ask: '1.65',
        volume: '150',
        'open interest': '250',
        'implied volatility': '0.35',
        expiration: '2023-12-15'
      }
    ]
  };

  const expectedNormalized: OptionChain = {
    '150': {
      calls: [{
        expiry: '2023-12-15',
        strike: 150,
        lastPrice: 1.50,
        bid: 1.45,
        ask: 1.55,
        volume: 100,
        openInterest: 200,
        impliedVol: 0.30
      }],
      puts: [{
        expiry: '2023-12-15',
        strike: 150,
        lastPrice: 1.60,
        bid: 1.55,
        ask: 1.65,
        volume: 150,
        openInterest: 250,
        impliedVol: 0.35
      }]
    }
  };

  beforeEach(() => {
    (fetch as jest.Mock).mockReset();
    // Clear cache between tests
    Object.keys(HistoricalDataService).forEach(key => {
      if (key.startsWith('__cache__')) {
        delete (HistoricalDataService as any)[key];
      }
    });
  });

afterEach(() => {
  jest.restoreAllMocks();
});
  it('fetches and normalizes data from API', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockApiResponse)
    });

    const result = await HistoricalDataService.fetchHistoricalOptions('TSLA', '2023-12-15');
    expect(result).toEqual(expectedNormalized);
    expect(fetch).toHaveBeenCalledWith(
      'https://www.alphavantage.co/query?function=OPTION_CHAIN&symbol=TSLA&expiration=2023-12-15&apikey=YOUR_API_KEY'
    );
  });

  it('returns cached data when available', async () => {
    // Add to cache directly
    const cacheKey = 'TSLA-2023-12-15';
    (HistoricalDataService as any).addToCache(cacheKey, expectedNormalized);

    const result = await HistoricalDataService.fetchHistoricalOptions('TSLA', '2023-12-15');
    expect(result).toEqual(expectedNormalized);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('throws DataFetchError for API errors', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'API limit reached'
    });

    try {
      await HistoricalDataService.fetchHistoricalOptions('TSLA', '2023-12-15');
      throw new Error('Expected function to throw DataFetchError');
    } catch (error: unknown) {
      // Define custom error interface for type safety
      interface CustomError extends Error {
        isDataFetchError?: boolean;
      }
      const err = error as CustomError;
      
      expect(err).toBeInstanceOf(Error);
      expect(err.isDataFetchError).toBe(true);
      expect(err.name).toBe('DataFetchError');
      expect(err.message).toContain('Failed to fetch historical options data');
    }
  });

  it('throws DataFetchError for network errors', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    try {
      await HistoricalDataService.fetchHistoricalOptions('TSLA', '2023-12-15');
      throw new Error('Expected function to throw DataFetchError');
    } catch (error: unknown) {
      // Define custom error interface for type safety
      interface CustomError extends Error {
        isDataFetchError?: boolean;
      }
      const err = error as CustomError;
      
      expect(err).toBeInstanceOf(Error);
      expect(err.isDataFetchError).toBe(true);
      expect(err.name).toBe('DataFetchError');
      expect(err.message).toContain('Failed to fetch historical options data');
    }
  });

  describe('normalizeOptionsData', () => {
    it('normalizes data correctly', () => {
      const result = HistoricalDataService.normalizeOptionsData(mockApiResponse);
      expect(result).toEqual(expectedNormalized);
    });

    it('throws error when apiData is null', () => {
      expect(() => HistoricalDataService.normalizeOptionsData(null)).toThrow(
        'normalizeOptionsData: apiData is null or undefined'
      );
    });

    it('throws error when apiData is undefined', () => {
      expect(() => HistoricalDataService.normalizeOptionsData(undefined)).toThrow(
        'normalizeOptionsData: apiData is null or undefined'
      );
    });

    it('throws error when apiData has no calls property', () => {
      // Use type assertion to bypass TypeScript checks
      const dataWithoutCalls = {...mockApiResponse} as any;
      delete dataWithoutCalls.calls;
      
      expect(() => HistoricalDataService.normalizeOptionsData(dataWithoutCalls)).toThrow(
        'normalizeOptionsData: apiData must have calls and puts properties'
      );
    });

    it('throws error when apiData has no puts property', () => {
      // Use type assertion to bypass TypeScript checks
      const dataWithoutPuts = {...mockApiResponse} as any;
      delete dataWithoutPuts.puts;
      
      expect(() => HistoricalDataService.normalizeOptionsData(dataWithoutPuts)).toThrow(
        'normalizeOptionsData: apiData must have calls and puts properties'
      );
    });

    it('handles non-array calls property', () => {
      const dataWithInvalidCalls = {...mockApiResponse, calls: 'invalid'};
      
      const result = HistoricalDataService.normalizeOptionsData(dataWithInvalidCalls);
      // Should skip calls but still process puts
      expect(result).toEqual({
        '150': {
          puts: [{
            expiry: '2023-12-15',
            strike: 150,
            lastPrice: 1.60,
            bid: 1.55,
            ask: 1.65,
            volume: 150,
            openInterest: 250,
            impliedVol: 0.35
          }],
          calls: []
        }
      });
    });

    it('handles non-array puts property', () => {
      const dataWithInvalidPuts = {...mockApiResponse, puts: 'invalid'};
      
      const result = HistoricalDataService.normalizeOptionsData(dataWithInvalidPuts);
      // Should skip puts but still process calls
      expect(result).toEqual({
        '150': {
          calls: [{
            expiry: '2023-12-15',
            strike: 150,
            lastPrice: 1.50,
            bid: 1.45,
            ask: 1.55,
            volume: 100,
            openInterest: 200,
            impliedVol: 0.30
          }],
          puts: []
        }
      });
    });

    it('handles empty API response', () => {
      expect(() => HistoricalDataService.normalizeOptionsData({})).toThrow(
        'normalizeOptionsData: apiData must have calls and puts properties'
      );
    });

    it('handles malformed API response', () => {
      expect(() => HistoricalDataService.normalizeOptionsData({
        invalid: {
          data: 'corrupted'
        }
      })).toThrow(
        'normalizeOptionsData: apiData must have calls and puts properties'
      );
    });
  });
});