import { RealTimeMarketDataService } from './RealTimeMarketDataService';
import { AlphaVantageService } from './AlphaVantageService';

/**
 * Enhanced market data service with real API integration
 */

const marketDataService = RealTimeMarketDataService.getInstance();
const alphaVantageService = AlphaVantageService.getInstance();

/**
 * Get current stock price
 */
export async function getCurrentPrice(ticker: string): Promise<number> {
  try {
    const quote = await marketDataService.getStockQuote(ticker);
    return quote.price;
  } catch (error) {
    console.error(`Failed to get current price for ${ticker}:`, error);
    // Fallback to mock data
    return getMockPrice(ticker);
  }
}

/**
 * Get detailed stock quote
 */
export async function getDetailedQuote(ticker: string) {
  try {
    return await marketDataService.getStockQuote(ticker);
  } catch (error) {
    console.error(`Failed to get detailed quote for ${ticker}:`, error);
    throw error;
  }
}

/**
 * Get historical volatility from real market data
 */
export async function getHistoricalVolatility(ticker: string): Promise<number> {
  try {
    // Get historical data for volatility calculation
    const historicalData = await alphaVantageService.getHistoricalData(ticker);
    
    if (!historicalData || !historicalData.data || historicalData.data.length < 20) {
      console.warn(`Insufficient historical data for ${ticker}, using default volatility`);
      return 0.25; // Default 25% volatility
    }

    // Calculate historical volatility (annualized)
    const returns = [];
    const dataArray = historicalData.data;
    for (let i = 1; i < Math.min(dataArray.length, 252); i++) { // Use up to 1 year of data
      const currentPrice = dataArray[i - 1].close;
      const previousPrice = dataArray[i].close;
      const dailyReturn = Math.log(currentPrice / previousPrice);
      returns.push(dailyReturn);
    }

    if (returns.length === 0) {
      return 0.25;
    }

    // Calculate standard deviation of returns
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    const dailyVolatility = Math.sqrt(variance);
    
    // Annualize the volatility (multiply by sqrt of trading days per year)
    const annualizedVolatility = dailyVolatility * Math.sqrt(252);
    
    console.log(`[MarketData] Calculated volatility for ${ticker}: ${(annualizedVolatility * 100).toFixed(2)}%`);
    return Math.max(0.1, Math.min(2.0, annualizedVolatility)); // Clamp between 10% and 200%
    
  } catch (error) {
    console.error(`Failed to calculate historical volatility for ${ticker}:`, error);
    return 0.25; // Default fallback
  }
}

/**
 * Get multiple stock quotes efficiently
 */
export async function getMultipleQuotes(symbols: string[]) {
  try {
    return await marketDataService.getMultipleQuotes(symbols);
  } catch (error) {
    console.error('Failed to get multiple quotes:', error);
    throw error;
  }
}

/**
 * Get option chain data
 */
export async function getOptionChain(symbol: string) {
  try {
    return await marketDataService.getOptionChain(symbol);
  } catch (error) {
    console.error(`Failed to get option chain for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Check if market data is available
 */
export async function isMarketDataAvailable(): Promise<boolean> {
  return await marketDataService.isMarketDataAvailable();
}

/**
 * Get provider status for debugging
 */
export async function getProviderStatus() {
  return await marketDataService.getProviderStatus();
}

/**
 * Clear all cached market data
 */
export function clearMarketDataCache(): void {
  marketDataService.clearCache();
  // AlphaVantageService doesn't have a clearCache method
}

/**
 * Mock price fallback for development
 */
function getMockPrice(ticker: string): number {
  const mockPrices: Record<string, number> = {
    'AAPL': 150 + (Math.random() - 0.5) * 10,
    'MSFT': 300 + (Math.random() - 0.5) * 20,
    'GOOGL': 2500 + (Math.random() - 0.5) * 100,
    'TSLA': 200 + (Math.random() - 0.5) * 20,
    'SPY': 400 + (Math.random() - 0.5) * 10,
    'QQQ': 350 + (Math.random() - 0.5) * 15,
    'MSTY': 45 + (Math.random() - 0.5) * 3,
    'PLTY': 28 + (Math.random() - 0.5) * 2,
    'TSLY': 35 + (Math.random() - 0.5) * 3
  };

  return mockPrices[ticker] || 100 + (Math.random() - 0.5) * 10;
}

/**
 * Legacy synchronous function for backward compatibility
 * @deprecated Use async getHistoricalVolatility() instead
 */
export function getHistoricalVolatilitySync(ticker: string): number {
  console.warn('getHistoricalVolatilitySync() is deprecated, use async getHistoricalVolatility() instead');
  return 0.25; // Default fallback
}