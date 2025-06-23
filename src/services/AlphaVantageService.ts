// Enhanced Alpha Vantage service with better error handling and rate limiting
// Alpha Vantage free tier: 5 requests/minute, 500 requests/day
const CACHE_TTL = 5 * 60 * 1000; // 5 minute cache

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  refreshedAt: number;
}

interface OptionQuote {
  symbol: string;
  strike: number;
  expiry: string;
  optionType: 'call' | 'put';
  bid: number;
  ask: number;
  lastPrice: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  refreshedAt: number;
}

export class AlphaVantageService {
  private static instance: AlphaVantageService;
  private cache: Record<string, StockQuote> = {};
  private optionCache: Record<string, OptionQuote> = {};
  private apiKey: string;
  private requestCount = 0;
  private lastResetTime = Date.now();
  private readonly maxRequestsPerMinute = 5;
  private readonly baseUrl = 'https://www.alphavantage.co/query';

  private constructor() {
    // In production, this should come from environment variables or user settings
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
  }

  public static getInstance(): AlphaVantageService {
    if (!AlphaVantageService.instance) {
      AlphaVantageService.instance = new AlphaVantageService();
    }
    return AlphaVantageService.instance;
  }

  /**
   * Get stock quote with enhanced data
   */
  public async getStockQuote(symbol: string): Promise<number> {
    const quote = await this.getDetailedStockQuote(symbol);
    return quote.price;
  }

  /**
   * Get detailed stock quote with change, volume, etc.
   */
  public async getDetailedStockQuote(symbol: string): Promise<StockQuote> {
    // Check cache first
    const cached = this.cache[symbol];
    if (cached && Date.now() - cached.refreshedAt < CACHE_TTL) {
      return cached;
    }

    // Check rate limits
    if (this.isRateLimited()) {
      if (cached) {
        console.warn(`Rate limited, returning cached data for ${symbol}`);
        return cached;
      }
      throw new Error('Rate limit exceeded and no cached data available');
    }

    this.incrementRequestCount();

    try {
      const url = `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Handle API errors
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
        throw new Error('Invalid price format from Alpha Vantage');
      }
      
      // Update cache
      const stockQuote: StockQuote = {
        symbol,
        price,
        change: change || 0,
        changePercent: changePercent || 0,
        volume: volume || 0,
        refreshedAt: Date.now()
      };

      this.cache[symbol] = stockQuote;
      
      console.log(`[AlphaVantage] Updated quote for ${symbol}: $${price} (${change >= 0 ? '+' : ''}${change})`);
      return stockQuote;
      
    } catch (error) {
      console.error(`AlphaVantageService error for ${symbol}:`, error);
      
      // Return cached data if available
      if (cached) {
        console.warn(`Returning cached data for ${symbol} due to API error`);
        return cached;
      }
      
      throw error;
    }
  }

  /**
   * Get historical data for volatility calculations
   */
  public async getHistoricalData(symbol: string, period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<any[]> {
    if (this.isRateLimited()) {
      throw new Error('Rate limit exceeded');
    }

    this.incrementRequestCount();

    const functionMap = {
      daily: 'TIME_SERIES_DAILY',
      weekly: 'TIME_SERIES_WEEKLY',
      monthly: 'TIME_SERIES_MONTHLY'
    };

    try {
      const url = `${this.baseUrl}?function=${functionMap[period]}&symbol=${symbol}&apikey=${this.apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data['Error Message']) {
        throw new Error(`Alpha Vantage error: ${data['Error Message']}`);
      }

      if (data['Note']) {
        throw new Error('Alpha Vantage rate limit exceeded');
      }

      const timeSeriesKey = Object.keys(data).find(key => key.includes('Time Series'));
      if (!timeSeriesKey) {
        throw new Error('Invalid historical data format');
      }

      const timeSeries = data[timeSeriesKey];
      return Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
        date,
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: parseInt(values['5. volume'])
      }));

    } catch (error) {
      console.error(`AlphaVantageService historical data error for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Check if service is available
   */
  public async isAvailable(): Promise<boolean> {
    if (this.isRateLimited()) {
      return false;
    }

    try {
      // Simple connectivity test with a known symbol
      const response = await fetch(`${this.baseUrl}?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${this.apiKey}`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get current rate limit status
   */
  public getRateLimitStatus(): { requestsRemaining: number; resetTime: number } {
    const now = Date.now();
    
    // Reset counter every minute
    if (now - this.lastResetTime > 60000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    return {
      requestsRemaining: Math.max(0, this.maxRequestsPerMinute - this.requestCount),
      resetTime: this.lastResetTime + 60000
    };
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache = {};
    this.optionCache = {};
  }

  /**
   * Set API key
   */
  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
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