import { HistoricalDataService } from '../historicalDataService';
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

  it('handles API errors', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'API limit reached'
    });

    await expect(HistoricalDataService.fetchHistoricalOptions('TSLA', '2023-12-15'))
      .rejects
      .toThrow('Historical data fetch failed');
  });

  describe('normalizeOptionsData', () => {
    it('normalizes data correctly', () => {
      const result = HistoricalDataService.normalizeOptionsData(mockApiResponse);
      expect(result).toEqual(expectedNormalized);
    });

    it('handles empty API response', () => {
      const result = HistoricalDataService.normalizeOptionsData({});
      expect(result).toEqual({
        '': {
          calls: [],
          puts: []
        }
      });
    });

    it('handles malformed API response', () => {
      const result = HistoricalDataService.normalizeOptionsData({
        invalid: {
          data: 'corrupted'
        }
      });
      expect(result).toEqual({
        '': {
          calls: [],
          puts: []
        }
      });
    });
  });
});