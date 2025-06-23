import { AlphaVantageService } from './AlphaVantageService';
import { TradeExecutionError } from './errors/TradeExecutionError';

/**
 * Unified real-time market data service
 * Supports multiple data providers with fallback mechanisms
 */

export interface MarketDataProvider {
  name: string;
  getStockQuote(symbol: string): Promise<StockQuote>;
  getOptionChain?(symbol: string): Promise<OptionChainData>;
  isAvailable(): Promise<boolean>;
}

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
  source: string;
}

export interface OptionData {
  strike: number;
  expiry: string;
  bid: number;
  ask: number;
  lastPrice: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

export interface OptionChainData {
  symbol: string;
  underlyingPrice: number;
  calls: OptionData[];
  puts: OptionData[];
  timestamp: number;
}

export interface MarketDataConfig {
  primaryProvider: string;
  fallbackProviders: string[];
  cacheTimeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export class RealTimeMarketDataService {
  private static instance: RealTimeMarketDataService;
  private providers: Map<string, MarketDataProvider> = new Map();
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private config: MarketDataConfig;

  private constructor() {
    this.config = {
      primaryProvider: 'alphavantage',
      fallbackProviders: ['iex', 'mock'],
      cacheTimeout: 5 * 60 * 1000, // 5 minutes
      retryAttempts: 3,
      retryDelay: 1000 // 1 second
    };

    this.initializeProviders();
  }

  public static getInstance(): RealTimeMarketDataService {
    if (!RealTimeMarketDataService.instance) {
      RealTimeMarketDataService.instance = new RealTimeMarketDataService();
    }
    return RealTimeMarketDataService.instance;
  }

  private initializeProviders(): void {
    // Register Alpha Vantage provider
    this.providers.set('alphavantage', new AlphaVantageProvider());
    
    // Register IEX Cloud provider (to be implemented)
    this.providers.set('iex', new IEXCloudProvider());
    
    // Register mock provider as fallback
    this.providers.set('mock', new MockMarketDataProvider());
  }

  /**
   * Get stock quote with automatic provider fallback
   */
  public async getStockQuote(symbol: string): Promise<StockQuote> {
    const cacheKey = `quote_${symbol}`;
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return cached as StockQuote;
    }

    const providers = [this.config.primaryProvider, ...this.config.fallbackProviders];
    
    for (const providerName of providers) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      try {
        // Check if provider is available
        const isAvailable = await provider.isAvailable();
        if (!isAvailable) continue;

        const quote = await this.retryOperation(() => provider.getStockQuote(symbol));
        
        // Cache the result
        this.setCachedData(cacheKey, quote);
        
        console.log(`[MarketData] Got quote for ${symbol} from ${providerName}: $${quote.price}`);
        return quote;
        
      } catch (error) {
        console.warn(`[MarketData] Provider ${providerName} failed for ${symbol}:`, error);
        continue;
      }
    }

    throw TradeExecutionError.marketDataUnavailable(symbol);
  }

  /**
   * Get option chain data
   */
  public async getOptionChain(symbol: string): Promise<OptionChainData> {
    const cacheKey = `options_${symbol}`;
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return cached as OptionChainData;
    }

    const providers = [this.config.primaryProvider, ...this.config.fallbackProviders];
    
    for (const providerName of providers) {
      const provider = this.providers.get(providerName);
      if (!provider?.getOptionChain) continue;

      try {
        const isAvailable = await provider.isAvailable();
        if (!isAvailable) continue;

        const optionChain = await this.retryOperation(() => provider.getOptionChain!(symbol));
        
        // Cache the result
        this.setCachedData(cacheKey, optionChain);
        
        console.log(`[MarketData] Got option chain for ${symbol} from ${providerName}`);
        return optionChain;
        
      } catch (error) {
        console.warn(`[MarketData] Provider ${providerName} failed for option chain ${symbol}:`, error);
        continue;
      }
    }

    throw TradeExecutionError.marketDataUnavailable(`${symbol} option chain`);
  }

  /**
   * Get multiple stock quotes efficiently
   */
  public async getMultipleQuotes(symbols: string[]): Promise<Map<string, StockQuote>> {
    const results = new Map<string, StockQuote>();
    
    // Process in batches to respect rate limits
    const batchSize = 5;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      
      const promises = batch.map(async (symbol) => {
        try {
          const quote = await this.getStockQuote(symbol);
          return { symbol, quote };
        } catch (error) {
          console.error(`Failed to get quote for ${symbol}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(promises);
      
      batchResults.forEach(result => {
        if (result) {
          results.set(result.symbol, result.quote);
        }
      });

      // Rate limiting delay between batches
      if (i + batchSize < symbols.length) {
        await this.delay(200); // 200ms delay between batches
      }
    }

    return results;
  }

  /**
   * Check if market data is available
   */
  public async isMarketDataAvailable(): Promise<boolean> {
    const provider = this.providers.get(this.config.primaryProvider);
    if (!provider) return false;

    try {
      return await provider.isAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Get provider status
   */
  public async getProviderStatus(): Promise<Map<string, boolean>> {
    const status = new Map<string, boolean>();
    
    for (const [name, provider] of this.providers) {
      try {
        status.set(name, await provider.isAvailable());
      } catch {
        status.set(name, false);
      }
    }

    return status;
  }

  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.config.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * attempt);
        }
      }
    }

    throw lastError!;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear all cached data
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<MarketDataConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Enhanced Alpha Vantage Provider
 */
class AlphaVantageProvider implements MarketDataProvider {
  name = 'alphavantage';
  private apiKey: string;
  private baseUrl = 'https://www.alphavantage.co/query';
  private requestCount = 0;
  private lastResetTime = Date.now();
  private readonly maxRequestsPerMinute = 5;

  constructor() {
    // In production, this should come from environment variables or user settings
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
  }

  async isAvailable(): Promise<boolean> {
    // Check rate limits
    if (this.isRateLimited()) {
      return false;
    }

    // Simple connectivity test
    try {
      const response = await fetch(`${this.baseUrl}?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${this.apiKey}`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async getStockQuote(symbol: string): Promise<StockQuote> {
    if (this.isRateLimited()) {
      throw new Error('Rate limit exceeded');
    }

    this.incrementRequestCount();

    const url = `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data['Error Message']) {
      throw new Error(`Alpha Vantage error: ${data['Error Message']}`);
    }

    if (data['Note']) {
      throw new Error('Alpha Vantage rate limit exceeded');
    }

    const quote = data['Global Quote'];
    if (!quote) {
      throw new Error('Invalid response format from Alpha Vantage');
    }

    const price = parseFloat(quote['05. price']);
    const change = parseFloat(quote['09. change']);
    const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));
    const volume = parseInt(quote['06. volume']);

    if (isNaN(price)) {
      throw new Error('Invalid price data from Alpha Vantage');
    }

    return {
      symbol,
      price,
      change: change || 0,
      changePercent: changePercent || 0,
      volume: volume || 0,
      timestamp: Date.now(),
      source: this.name
    };
  }

  private isRateLimited(): boolean {
    const now = Date.now();
    
    // Reset counter every minute
    if (now - this.lastResetTime > 60000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    return this.requestCount >= this.maxRequestsPerMinute;
  }

  private incrementRequestCount(): void {
    this.requestCount++;
  }
}

/**
 * IEX Cloud Provider (placeholder for future implementation)
 */
class IEXCloudProvider implements MarketDataProvider {
  name = 'iex';

  async isAvailable(): Promise<boolean> {
    // TODO: Implement IEX Cloud connectivity check
    return false; // Disabled for now
  }

  async getStockQuote(symbol: string): Promise<StockQuote> {
    // TODO: Implement IEX Cloud stock quote
    throw new Error('IEX Cloud provider not implemented yet');
  }
}

/**
 * Mock Provider for development and fallback
 */
class MockMarketDataProvider implements MarketDataProvider {
  name = 'mock';

  async isAvailable(): Promise<boolean> {
    return true; // Always available
  }

  async getStockQuote(symbol: string): Promise<StockQuote> {
    // Generate realistic mock data
    const basePrice = this.getBasePriceForSymbol(symbol);
    const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
    const price = basePrice * (1 + variation);
    const change = price - basePrice;
    const changePercent = (change / basePrice) * 100;

    return {
      symbol,
      price: Math.round(price * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      volume: Math.floor(Math.random() * 1000000),
      timestamp: Date.now(),
      source: this.name
    };
  }

  async getOptionChain(symbol: string): Promise<OptionChainData> {
    const underlyingPrice = this.getBasePriceForSymbol(symbol);
    const calls: OptionData[] = [];
    const puts: OptionData[] = [];

    // Generate mock option data
    const strikes = [90, 95, 100, 105, 110, 115, 120];
    const expiries = ['2025-01-17', '2025-02-21', '2025-03-21'];

    for (const expiry of expiries) {
      for (const strike of strikes) {
        const timeToExpiry = (new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 365);
        const intrinsicCall = Math.max(0, underlyingPrice - strike);
        const intrinsicPut = Math.max(0, strike - underlyingPrice);
        
        calls.push({
          strike,
          expiry,
          bid: intrinsicCall + Math.random() * 5,
          ask: intrinsicCall + Math.random() * 5 + 0.5,
          lastPrice: intrinsicCall + Math.random() * 5 + 0.25,
          volume: Math.floor(Math.random() * 1000),
          openInterest: Math.floor(Math.random() * 5000),
          impliedVolatility: 0.2 + Math.random() * 0.3
        });

        puts.push({
          strike,
          expiry,
          bid: intrinsicPut + Math.random() * 5,
          ask: intrinsicPut + Math.random() * 5 + 0.5,
          lastPrice: intrinsicPut + Math.random() * 5 + 0.25,
          volume: Math.floor(Math.random() * 1000),
          openInterest: Math.floor(Math.random() * 5000),
          impliedVolatility: 0.2 + Math.random() * 0.3
        });
      }
    }

    return {
      symbol,
      underlyingPrice,
      calls,
      puts,
      timestamp: Date.now()
    };
  }

  private getBasePriceForSymbol(symbol: string): number {
    const basePrices: Record<string, number> = {
      'AAPL': 150,
      'MSFT': 300,
      'GOOGL': 2500,
      'TSLA': 200,
      'SPY': 400,
      'QQQ': 350,
      'MSTY': 45,
      'PLTY': 28,
      'TSLY': 35
    };

    return basePrices[symbol] || 100;
  }
}