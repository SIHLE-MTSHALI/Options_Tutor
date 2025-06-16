import { OptionChain, OptionData } from '@redux/marketDataSlice';

export class MockApiService {
  private static instance: MockApiService;
  private mockData: Record<string, OptionChain> = {};

  private constructor() {
    this.initializeMockData();
  }

  public static getInstance(): MockApiService {
    if (!MockApiService.instance) {
      MockApiService.instance = new MockApiService();
    }
    return MockApiService.instance;
  }

  private initializeMockData(): void {
    const symbols = ['TSLA', 'AAPL', 'SPY'];
    const strikes = [100, 110, 120, 130, 140, 150];
    const expiries = ['2025-06-20', '2025-07-18', '2025-08-15'];

    symbols.forEach(symbol => {
      const chain: OptionChain = {};
      
      strikes.forEach(strike => {
        const strikeKey = strike.toFixed(2);
        chain[strikeKey] = {
          calls: expiries.map(expiry => this.createOption(expiry, strike, 'call')),
          puts: expiries.map(expiry => this.createOption(expiry, strike, 'put'))
        };
      });

      this.mockData[symbol] = chain;
    });
  }

  private createOption(expiry: string, strike: number, type: 'call' | 'put'): OptionData {
    const basePrice = type === 'call' ? strike * 0.9 : strike * 1.1;
    return {
      expiry,
      strike,
      lastPrice: basePrice + (Math.random() * 5),
      bid: basePrice + (Math.random() * 4),
      ask: basePrice + (Math.random() * 4) + 0.5,
      volume: Math.floor(Math.random() * 1000),
      openInterest: Math.floor(Math.random() * 500),
      impliedVol: 0.3 + (Math.random() * 0.2)
    };
  }

  public async fetchHistoricalData(symbol: string): Promise<OptionChain> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(this.mockData[symbol] || {});
      }, 300); // Simulate network delay
    });
  }

  public async fetchStockQuote(symbol: string): Promise<{ price: number }> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ price: 150 + (Math.random() * 100) }); // Mock price between 150-250
      }, 200);
    });
  }
public async executeStockTrade(trade: { symbol: string; quantity: number; action: 'buy' | 'sell'; type: 'market' }): Promise<void> {
  return new Promise(resolve => {
    setTimeout(() => {
      console.log(`Executed stock trade: ${trade.action} ${trade.quantity} shares of ${trade.symbol}`);
      resolve();
    }, 200);
  });
}
}