import { AppDispatch } from '@redux/store';
import { updateOptionChain, OptionChain, OptionData } from '@redux/marketDataSlice';

interface HistoricalDataOptions {
  symbol: string;
  startDate: string;
  endDate: string;
  expiry?: string;
}

export class HistoricalDataService {
  private dispatch: AppDispatch;
  private cache: Map<string, OptionChain> = new Map();

  constructor(dispatch: AppDispatch) {
    this.dispatch = dispatch;
  }

  async fetchHistoricalChain(options: HistoricalDataOptions): Promise<void> {
    const cacheKey = this.getCacheKey(options);
    
    if (this.cache.has(cacheKey)) {
      const cachedData = this.cache.get(cacheKey)!;
      this.dispatch(updateOptionChain({
        symbol: options.symbol,
        chain: cachedData
      }));
      return;
    }

    try {
      const response = await fetch(this.buildUrl(options));
      const data = await response.json();
      
      const normalizedChain = this.normalizeChain(data);
      this.cache.set(cacheKey, normalizedChain);
      
      this.dispatch(updateOptionChain({
        symbol: options.symbol,
        chain: normalizedChain
      }));
    } catch (error) {
      console.error('Failed to fetch historical data:', error);
      throw error;
    }
  }

  private getCacheKey(options: HistoricalDataOptions): string {
    return `${options.symbol}-${options.startDate}-${options.endDate}`;
  }

  private buildUrl(options: HistoricalDataOptions): string {
    if (process.env.NODE_ENV === 'development') {
      return '/api/historical-options';
    }
    return `https://api.example.com/historical-options/${options.symbol}?start=${options.startDate}&end=${options.endDate}`;
  }

  private normalizeChain(rawData: any): OptionChain {
    const chain: OptionChain = {};
    
    rawData.forEach((entry: any) => {
      const strike = entry.strike.toFixed(2);
      
      if (!chain[strike]) {
        chain[strike] = { calls: [], puts: [] };
      }

      const optionData: OptionData = {
        expiry: entry.expiry,
        strike: entry.strike,
        lastPrice: entry.lastPrice,
        bid: entry.bid,
        ask: entry.ask,
        volume: entry.volume,
        openInterest: entry.openInterest,
        impliedVol: entry.impliedVol
      };

      if (entry.optionType === 'call') {
        chain[strike].calls.push(optionData);
      } else {
        chain[strike].puts.push(optionData);
      }
    });

    return chain;
  }
}