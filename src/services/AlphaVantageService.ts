import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

// Enhanced Alpha Vantage service with data persistence and automated fetching
// Alpha Vantage free tier: 25 requests/day (conservative limit to stay well under 500/day)
const DAILY_REQUEST_LIMIT = 25;
const REQUEST_DELAY = 12000; // 12 seconds between requests (5 requests/minute max)
const DATA_REFRESH_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours between data fetches

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  peRatio?: number;
  dividendYield?: number;
  refreshedAt: number;
  lastFetchAt: number;
}

interface HistoricalData {
  symbol: string;
  data: {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
  refreshedAt: number;
}

interface CompanyOverview {
  symbol: string;
  name: string;
  description: string;
  sector: string;
  industry: string;
  marketCap: number;
  peRatio: number;
  pegRatio: number;
  dividendYield: number;
  beta: number;
  eps: number;
  refreshedAt: number;
}

interface DataStorage {
  quotes: Record<string, StockQuote>;
  historical: Record<string, HistoricalData>;
  company: Record<string, CompanyOverview>;
  metadata: {
    lastUpdate: number;
    requestsToday: number;
    lastRequestDate: string;
  };
}

interface RateLimitStatus {
  requestsRemaining: number;
  requestsToday: number;
  nextRequestTime: number;
  canMakeRequest: boolean;
}

export class AlphaVantageService {
  private static instance: AlphaVantageService;
  private apiKey: string;
  private dataPath: string;
  private storage: DataStorage;
  private lastRequestTime = 0;
  private readonly baseUrl = 'https://www.alphavantage.co/query';
  private readonly watchedSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'MSTY', 'NVDA', 'META', 'SPY', 'QQQ'];
  private fetchInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
    this.dataPath = this.getDataPath();
    this.storage = this.loadStoredData();
    this.startAutomaticDataFetching();
  }

  public static getInstance(): AlphaVantageService {
    if (!AlphaVantageService.instance) {
      AlphaVantageService.instance = new AlphaVantageService();
    }
    return AlphaVantageService.instance;
  }

  /**
   * Get the data storage path
   */
  private getDataPath(): string {
    const userDataPath = app?.getPath('userData') || path.join(process.cwd(), 'data');
    const dataDir = path.join(userDataPath, 'market-data');
    
    // Ensure directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    return path.join(dataDir, 'alpha-vantage-data.json');
  }

  /**
   * Load stored data from disk
   */
  private loadStoredData(): DataStorage {
    try {
      if (fs.existsSync(this.dataPath)) {
        const data = fs.readFileSync(this.dataPath, 'utf8');
        const parsed = JSON.parse(data);
        console.log('[AlphaVantage] Loaded stored data with', Object.keys(parsed.quotes || {}).length, 'quotes');
        return parsed;
      }
    } catch (error) {
      console.error('[AlphaVantage] Error loading stored data:', error);
    }

    // Return default structure
    return {
      quotes: {},
      historical: {},
      company: {},
      metadata: {
        lastUpdate: 0,
        requestsToday: 0,
        lastRequestDate: new Date().toDateString()
      }
    };
  }

  /**
   * Save data to disk
   */
  private saveStoredData(): void {
    try {
      const data = JSON.stringify(this.storage, null, 2);
      fs.writeFileSync(this.dataPath, data, 'utf8');
      console.log('[AlphaVantage] Data saved to disk');
    } catch (error) {
      console.error('[AlphaVantage] Error saving data:', error);
    }
  }

  /**
   * Start automatic data fetching
   */
  private startAutomaticDataFetching(): void {
    // Initial fetch if data is stale
    if (this.shouldRefreshData()) {
      setTimeout(() => this.fetchAllData(), 5000); // Wait 5 seconds after startup
    }

    // Set up interval for twice-daily fetching (every 12 hours)
    this.fetchInterval = setInterval(() => {
      if (this.shouldRefreshData()) {
        this.fetchAllData();
      }
    }, DATA_REFRESH_INTERVAL);

    console.log('[AlphaVantage] Automatic data fetching started');
  }

  /**
   * Stop automatic data fetching
   */
  public stopAutomaticDataFetching(): void {
    if (this.fetchInterval) {
      clearInterval(this.fetchInterval);
      this.fetchInterval = null;
      console.log('[AlphaVantage] Automatic data fetching stopped');
    }
  }

  /**
   * Check if data should be refreshed
   */
  private shouldRefreshData(): boolean {
    const now = Date.now();
    const lastUpdate = this.storage.metadata.lastUpdate;
    const timeSinceUpdate = now - lastUpdate;
    
    return timeSinceUpdate > DATA_REFRESH_INTERVAL;
  }

  /**
   * Reset daily request counter if it's a new day
   */
  private resetDailyCounterIfNeeded(): void {
    const today = new Date().toDateString();
    if (this.storage.metadata.lastRequestDate !== today) {
      this.storage.metadata.requestsToday = 0;
      this.storage.metadata.lastRequestDate = today;
      console.log('[AlphaVantage] Reset daily request counter for new day');
    }
  }

  /**
   * Check rate limiting status
   */
  public getRateLimitStatus(): RateLimitStatus {
    this.resetDailyCounterIfNeeded();
    
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const canMakeRequest = timeSinceLastRequest >= REQUEST_DELAY && 
                          this.storage.metadata.requestsToday < DAILY_REQUEST_LIMIT;
    
    return {
      requestsRemaining: Math.max(0, DAILY_REQUEST_LIMIT - this.storage.metadata.requestsToday),
      requestsToday: this.storage.metadata.requestsToday,
      nextRequestTime: this.lastRequestTime + REQUEST_DELAY,
      canMakeRequest
    };
  }

  /**
   * Wait for rate limit if needed
   */
  private async waitForRateLimit(): Promise<void> {
    const status = this.getRateLimitStatus();
    
    if (!status.canMakeRequest) {
      if (status.requestsToday >= DAILY_REQUEST_LIMIT) {
        throw new Error(`Daily request limit of ${DAILY_REQUEST_LIMIT} reached`);
      }
      
      const waitTime = status.nextRequestTime - Date.now();
      if (waitTime > 0) {
        console.log(`[AlphaVantage] Waiting ${waitTime}ms for rate limit`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  /**
   * Fetch all data for watched symbols
   */
  private async fetchAllData(): Promise<void> {
    console.log('[AlphaVantage] Starting automated data fetch');
    
    try {
      // Fetch quotes for all watched symbols
      for (const symbol of this.watchedSymbols) {
        try {
          await this.fetchStockQuote(symbol);
          await this.fetchCompanyOverview(symbol);
          await this.fetchHistoricalData(symbol);
        } catch (error) {
          console.error(`[AlphaVantage] Error fetching data for ${symbol}:`, error);
          // Continue with next symbol
        }
      }

      this.storage.metadata.lastUpdate = Date.now();
      this.saveStoredData();
      
      console.log('[AlphaVantage] Automated data fetch completed');
    } catch (error) {
      console.error('[AlphaVantage] Error in automated data fetch:', error);
    }
  }

  /**
   * Fetch stock quote from API
   */
  private async fetchStockQuote(symbol: string): Promise<StockQuote> {
    await this.waitForRateLimit();
    
    try {
      const url = `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKey}`;
      const response = await fetch(url);
      
      this.lastRequestTime = Date.now();
      this.storage.metadata.requestsToday++;
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
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
        throw new Error('Invalid price format from Alpha Vantage');
      }
      
      const stockQuote: StockQuote = {
        symbol,
        price,
        change: change || 0,
        changePercent: changePercent || 0,
        volume: volume || 0,
        refreshedAt: Date.now(),
        lastFetchAt: Date.now()
      };

      this.storage.quotes[symbol] = stockQuote;
      
      console.log(`[AlphaVantage] Fetched quote for ${symbol}: $${price} (${change >= 0 ? '+' : ''}${change})`);
      return stockQuote;
      
    } catch (error) {
      console.error(`[AlphaVantage] Error fetching quote for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Fetch company overview from API
   */
  private async fetchCompanyOverview(symbol: string): Promise<CompanyOverview> {
    await this.waitForRateLimit();
    
    try {
      const url = `${this.baseUrl}?function=OVERVIEW&symbol=${symbol}&apikey=${this.apiKey}`;
      const response = await fetch(url);
      
      this.lastRequestTime = Date.now();
      this.storage.metadata.requestsToday++;
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data['Error Message']) {
        throw new Error(`Alpha Vantage error: ${data['Error Message']}`);
      }

      if (data['Note']) {
        throw new Error('Alpha Vantage rate limit exceeded');
      }
      
      const overview: CompanyOverview = {
        symbol,
        name: data['Name'] || symbol,
        description: data['Description'] || '',
        sector: data['Sector'] || '',
        industry: data['Industry'] || '',
        marketCap: parseFloat(data['MarketCapitalization']) || 0,
        peRatio: parseFloat(data['PERatio']) || 0,
        pegRatio: parseFloat(data['PEGRatio']) || 0,
        dividendYield: parseFloat(data['DividendYield']) || 0,
        beta: parseFloat(data['Beta']) || 1,
        eps: parseFloat(data['EPS']) || 0,
        refreshedAt: Date.now()
      };

      this.storage.company[symbol] = overview;
      
      console.log(`[AlphaVantage] Fetched company overview for ${symbol}: ${overview.name}`);
      return overview;
      
    } catch (error) {
      console.error(`[AlphaVantage] Error fetching company overview for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Fetch historical data from API
   */
  private async fetchHistoricalData(symbol: string, period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<HistoricalData> {
    await this.waitForRateLimit();
    
    const functionMap = {
      daily: 'TIME_SERIES_DAILY',
      weekly: 'TIME_SERIES_WEEKLY',
      monthly: 'TIME_SERIES_MONTHLY'
    };

    try {
      const url = `${this.baseUrl}?function=${functionMap[period]}&symbol=${symbol}&apikey=${this.apiKey}`;
      const response = await fetch(url);
      
      this.lastRequestTime = Date.now();
      this.storage.metadata.requestsToday++;
      
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
      const historicalData: HistoricalData = {
        symbol,
        data: Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
          date,
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: parseInt(values['5. volume'])
        })).slice(0, 100), // Keep last 100 days
        refreshedAt: Date.now()
      };

      this.storage.historical[symbol] = historicalData;
      
      console.log(`[AlphaVantage] Fetched historical data for ${symbol}: ${historicalData.data.length} records`);
      return historicalData;

    } catch (error) {
      console.error(`[AlphaVantage] Error fetching historical data for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get stock quote (from stored data)
   */
  public async getStockQuote(symbol: string): Promise<number> {
    const quote = await this.getDetailedStockQuote(symbol);
    return quote.price;
  }

  /**
   * Get detailed stock quote (from stored data)
   */
  public async getDetailedStockQuote(symbol: string): Promise<StockQuote> {
    const stored = this.storage.quotes[symbol];
    
    if (stored) {
      return stored;
    }
    
    // If not in storage and we have API quota, try to fetch
    const status = this.getRateLimitStatus();
    if (status.canMakeRequest) {
      try {
        const quote = await this.fetchStockQuote(symbol);
        this.saveStoredData();
        return quote;
      } catch (error) {
        console.error(`[AlphaVantage] Failed to fetch quote for ${symbol}:`, error);
      }
    }
    
    // Return mock data if no stored data available
    console.warn(`[AlphaVantage] No stored data for ${symbol}, returning mock data`);
    return this.getMockQuote(symbol);
  }

  /**
   * Get company overview (from stored data)
   */
  public getCompanyOverview(symbol: string): CompanyOverview | null {
    return this.storage.company[symbol] || null;
  }

  /**
   * Get historical data (from stored data)
   */
  public getHistoricalData(symbol: string): HistoricalData | null {
    return this.storage.historical[symbol] || null;
  }

  /**
   * Get mock quote for testing/fallback
   */
  private getMockQuote(symbol: string): StockQuote {
    const basePrice = symbol === 'AAPL' ? 150 : 
                     symbol === 'MSFT' ? 300 :
                     symbol === 'GOOGL' ? 2500 :
                     symbol === 'MSTY' ? 25 : 100;
    
    const randomChange = (Math.random() - 0.5) * 10;
    const price = basePrice + randomChange;
    
    return {
      symbol,
      price,
      change: randomChange,
      changePercent: (randomChange / basePrice) * 100,
      volume: Math.floor(Math.random() * 1000000),
      refreshedAt: Date.now(),
      lastFetchAt: 0
    };
  }

  /**
   * Check if service is available
   */
  public async isAvailable(): Promise<boolean> {
    const status = this.getRateLimitStatus();
    if (!status.canMakeRequest) {
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
   * Get all stored symbols
   */
  public getStoredSymbols(): string[] {
    return Object.keys(this.storage.quotes);
  }

  /**
   * Get data freshness info
   */
  public getDataFreshness(): { lastUpdate: number; isStale: boolean; nextUpdate: number } {
    const lastUpdate = this.storage.metadata.lastUpdate;
    const isStale = this.shouldRefreshData();
    const nextUpdate = lastUpdate + DATA_REFRESH_INTERVAL;
    
    return { lastUpdate, isStale, nextUpdate };
  }

  /**
   * Force refresh of specific symbol
   */
  public async forceRefresh(symbol: string): Promise<void> {
    const status = this.getRateLimitStatus();
    if (!status.canMakeRequest) {
      throw new Error('Cannot refresh: rate limit exceeded');
    }

    try {
      await this.fetchStockQuote(symbol);
      await this.fetchCompanyOverview(symbol);
      await this.fetchHistoricalData(symbol);
      this.saveStoredData();
      console.log(`[AlphaVantage] Force refreshed data for ${symbol}`);
    } catch (error) {
      console.error(`[AlphaVantage] Error force refreshing ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Add symbol to watched list
   */
  public addWatchedSymbol(symbol: string): void {
    if (!this.watchedSymbols.includes(symbol)) {
      this.watchedSymbols.push(symbol);
      console.log(`[AlphaVantage] Added ${symbol} to watched symbols`);
    }
  }

  /**
   * Remove symbol from watched list
   */
  public removeWatchedSymbol(symbol: string): void {
    const index = this.watchedSymbols.indexOf(symbol);
    if (index > -1) {
      this.watchedSymbols.splice(index, 1);
      console.log(`[AlphaVantage] Removed ${symbol} from watched symbols`);
    }
  }

  /**
   * Get watched symbols
   */
  public getWatchedSymbols(): string[] {
    return [...this.watchedSymbols];
  }

  /**
   * Clear all stored data
   */
  public clearStoredData(): void {
    this.storage = {
      quotes: {},
      historical: {},
      company: {},
      metadata: {
        lastUpdate: 0,
        requestsToday: 0,
        lastRequestDate: new Date().toDateString()
      }
    };
    this.saveStoredData();
    console.log('[AlphaVantage] Cleared all stored data');
  }

  /**
   * Set API key
   */
  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    console.log('[AlphaVantage] API key updated');
  }

  /**
   * Get API key status
   */
  public getApiKeyStatus(): { hasKey: boolean; isDemo: boolean } {
    return {
      hasKey: !!this.apiKey && this.apiKey !== 'demo',
      isDemo: this.apiKey === 'demo'
    };
  }

  /**
   * Export stored data
   */
  public exportData(): DataStorage {
    return JSON.parse(JSON.stringify(this.storage));
  }

  /**
   * Import stored data
   */
  public importData(data: DataStorage): void {
    this.storage = data;
    this.saveStoredData();
    console.log('[AlphaVantage] Imported data');
  }

  /**
   * Get storage statistics
   */
  public getStorageStats(): {
    quotesCount: number;
    historicalCount: number;
    companyCount: number;
    totalSize: number;
    lastUpdate: number;
  } {
    const dataString = JSON.stringify(this.storage);
    return {
      quotesCount: Object.keys(this.storage.quotes).length,
      historicalCount: Object.keys(this.storage.historical).length,
      companyCount: Object.keys(this.storage.company).length,
      totalSize: dataString.length,
      lastUpdate: this.storage.metadata.lastUpdate
    };
  }

  /**
   * Cleanup old data
   */
  public cleanupOldData(maxAge: number = 7 * 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    let cleaned = 0;

    // Clean old quotes
    for (const [symbol, quote] of Object.entries(this.storage.quotes)) {
      if (now - quote.refreshedAt > maxAge) {
        delete this.storage.quotes[symbol];
        cleaned++;
      }
    }

    // Clean old historical data
    for (const [symbol, historical] of Object.entries(this.storage.historical)) {
      if (now - historical.refreshedAt > maxAge) {
        delete this.storage.historical[symbol];
        cleaned++;
      }
    }

    // Clean old company data
    for (const [symbol, company] of Object.entries(this.storage.company)) {
      if (now - company.refreshedAt > maxAge) {
        delete this.storage.company[symbol];
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.saveStoredData();
      console.log(`[AlphaVantage] Cleaned up ${cleaned} old data entries`);
    }
  }
}