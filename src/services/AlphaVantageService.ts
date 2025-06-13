// Alpha Vantage free tier: 5 requests/minute, 500 requests/day
const API_KEY = 'demo'; // Replace with user's API key
const CACHE_TTL = 5 * 60 * 1000; // 5 minute cache

interface StockQuote {
  symbol: string;
  price: number;
  refreshedAt: number;
}

export class AlphaVantageService {
  private static instance: AlphaVantageService;
  private cache: Record<string, StockQuote> = {};

  private constructor() {}

  public static getInstance(): AlphaVantageService {
    if (!AlphaVantageService.instance) {
      AlphaVantageService.instance = new AlphaVantageService();
    }
    return AlphaVantageService.instance;
  }

  public async getStockQuote(symbol: string): Promise<number> {
    // Check cache first
    const cached = this.cache[symbol];
    if (cached && Date.now() - cached.refreshedAt < CACHE_TTL) {
      return cached.price;
    }

    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`
      );
      
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      
      const data = await response.json();
      const price = parseFloat(data['Global Quote']['05. price']);
      
      if (isNaN(price)) throw new Error('Invalid price format');
      
      // Update cache
      this.cache[symbol] = {
        symbol,
        price,
        refreshedAt: Date.now()
      };
      
      return price;
    } catch (error) {
      console.error('AlphaVantageService error:', error);
      return cached?.price || 0; // Return cached if available
    }
  }
}