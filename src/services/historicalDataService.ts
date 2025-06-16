/**
 * HistoricalDataService - Fetches and processes historical options data
 * Uses AlphaVantage API with 24-hour caching
 */
import { OptionChain } from '../redux/marketDataSlice';

const API_KEY = 'YOUR_API_KEY'; // Placeholder - user should replace with actual key
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

import { DataFetchError } from './errors/DataFetchError';

type CacheEntry = {
  timestamp: number;
  data: OptionChain;
};

const dataCache: Record<string, CacheEntry> = {};

export class HistoricalDataService {
  /**
   * Fetch historical options chain for a symbol
   * @param symbol Stock ticker symbol
   * @param expiry Option expiration date (YYYY-MM-DD)
   * @returns Normalized OptionChain data
   */
  static async fetchHistoricalOptions(symbol: string, expiry: string): Promise<OptionChain> {
    const cacheKey = `${symbol}-${expiry}`;
    const cachedData = this.getFromCache(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }

    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=OPTION_CHAIN&symbol=${symbol}&expiration=${expiry}&apikey=${API_KEY}`
      );
      
      if (!response.ok) {
        throw new DataFetchError(`Failed to fetch historical options data: ${response.statusText}`);
      }

      const apiData = await response.json();
      const normalizedData = this.normalizeOptionsData(apiData);
      
      this.addToCache(cacheKey, normalizedData);
      return normalizedData;
    } catch (error) {
      console.error(`Historical data fetch failed for ${symbol}/${expiry}:`, error);
      
      // Preserve original error type if it's already a DataFetchError
      if (error instanceof DataFetchError) {
        throw error;
      }
      
      // Wrap generic errors in DataFetchError
      if (error instanceof Error) {
        throw new DataFetchError(`Failed to fetch historical options data: ${error.message}`);
      }
      
      throw new DataFetchError('Failed to fetch historical options data');
    }
  }

  /**
   * Normalize AlphaVantage options data to our OptionChain format
   * @param apiData Raw data from AlphaVantage
   * @returns Normalized OptionChain
   */
  static normalizeOptionsData(apiData: any): OptionChain {
    if (!apiData) {
      throw new Error('normalizeOptionsData: apiData is null or undefined');
    }
    
    // Validate required properties
    if (!apiData.calls || !apiData.puts) {
      throw new Error('normalizeOptionsData: apiData must have calls and puts properties');
    }
    
    const normalized: OptionChain = {};
    
    // Process calls - skip if not array
    if (Array.isArray(apiData.calls)) {
      apiData.calls.forEach((call: any) => {
        const strike = parseFloat(call.strike);
        if (!normalized[strike]) normalized[strike] = { calls: [], puts: [] };
        
        normalized[strike].calls.push({
          expiry: call.expiration,
          strike,
          lastPrice: parseFloat(call['last price']),
          bid: parseFloat(call.bid),
          ask: parseFloat(call.ask),
          volume: parseInt(call.volume),
          openInterest: parseInt(call['open interest']),
          impliedVol: parseFloat(call['implied volatility']),
        });
      });
    }

    // Process puts - skip if not array
    if (Array.isArray(apiData.puts)) {
      apiData.puts.forEach((put: any) => {
        const strike = parseFloat(put.strike);
        if (!normalized[strike]) normalized[strike] = { calls: [], puts: [] };
        
        normalized[strike].puts.push({
          expiry: put.expiration,
          strike,
          lastPrice: parseFloat(put['last price']),
          bid: parseFloat(put.bid),
          ask: parseFloat(put.ask),
          volume: parseInt(put.volume),
          openInterest: parseInt(put['open interest']),
          impliedVol: parseFloat(put['implied volatility']),
        });
      });
    }

    return normalized;
  }

  /**
   * Retrieve data from cache if valid
   * @param cacheKey Cache key (symbol-expiry)
   * @returns Cached data or null if expired/missing
   */
  private static getFromCache(cacheKey: string): OptionChain | null {
    const entry = dataCache[cacheKey];
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
      return entry.data;
    }
    return null;
  }

  /**
   * Add data to cache
   * @param cacheKey Cache key (symbol-expiry)
   * @param data Data to cache
   */
  private static addToCache(cacheKey: string, data: OptionChain): void {
    dataCache[cacheKey] = {
      timestamp: Date.now(),
      data
    };
  }
}