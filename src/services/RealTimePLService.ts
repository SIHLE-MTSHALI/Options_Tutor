import { RealTimeMarketDataService } from './RealTimeMarketDataService';
import { Position } from '../redux/types';
import { store } from '../redux/store';
import { updatePositionPL, updatePortfolioPL } from '../redux/portfolioSlice';

/**
 * Real-time P&L calculation and update service
 */

export interface PLUpdate {
  positionId: string;
  symbol: string;
  currentPrice: number;
  unrealizedPL: number;
  percentChange: number;
  timestamp: number;
}

export interface PortfolioPLSummary {
  totalUnrealizedPL: number;
  totalRealizedPL: number;
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  positions: PLUpdate[];
  timestamp: number;
}

export class RealTimePLService {
  private static instance: RealTimePLService;
  private marketDataService: RealTimeMarketDataService;
  private updateInterval: NodeJS.Timeout | null = null;
  private subscribers: Set<(update: PortfolioPLSummary) => void> = new Set();
  private isRunning = false;
  private updateFrequency = 5000; // 5 seconds default
  private lastPrices: Map<string, number> = new Map();

  private constructor() {
    this.marketDataService = RealTimeMarketDataService.getInstance();
  }

  public static getInstance(): RealTimePLService {
    if (!RealTimePLService.instance) {
      RealTimePLService.instance = new RealTimePLService();
    }
    return RealTimePLService.instance;
  }

  /**
   * Start real-time P&L updates
   */
  public start(updateFrequencyMs: number = 5000): void {
    if (this.isRunning) {
      console.warn('RealTimePLService is already running');
      return;
    }

    this.updateFrequency = updateFrequencyMs;
    this.isRunning = true;

    console.log(`[RealTimePL] Starting real-time P&L updates every ${updateFrequencyMs}ms`);

    this.updateInterval = setInterval(async () => {
      try {
        await this.updatePortfolioPL();
      } catch (error) {
        console.error('[RealTimePL] Error updating portfolio P&L:', error);
      }
    }, updateFrequencyMs);

    // Initial update
    this.updatePortfolioPL();
  }

  /**
   * Stop real-time P&L updates
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.isRunning = false;
    console.log('[RealTimePL] Stopped real-time P&L updates');
  }

  /**
   * Subscribe to P&L updates
   */
  public subscribe(callback: (update: PortfolioPLSummary) => void): () => void {
    this.subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get current portfolio P&L summary
   */
  public async getCurrentPortfolioPL(): Promise<PortfolioPLSummary> {
    const state = store.getState();
    const positions = state.portfolio.positions;

    if (positions.length === 0) {
      return {
        totalUnrealizedPL: 0,
        totalRealizedPL: state.portfolio.realizedPL,
        totalValue: state.portfolio.cashBalance,
        dayChange: 0,
        dayChangePercent: 0,
        positions: [],
        timestamp: Date.now()
      };
    }

    // Get unique symbols
    const symbols = [...new Set(positions.map(p => p.symbol))];
    
    // Get current prices for all symbols
    const quotes = await this.marketDataService.getMultipleQuotes(symbols);
    
    // Calculate P&L for each position
    const positionUpdates: PLUpdate[] = [];
    let totalUnrealizedPL = 0;
    let totalValue = state.portfolio.cashBalance;

    for (const position of positions) {
      const quote = quotes.get(position.symbol);
      if (!quote) {
        console.warn(`No quote available for ${position.symbol}`);
        continue;
      }

      const plUpdate = this.calculatePositionPL(position, quote.price);
      positionUpdates.push(plUpdate);
      totalUnrealizedPL += plUpdate.unrealizedPL;
      
      // Add position value to total portfolio value
      if (position.type === 'stock') {
        totalValue += Math.abs(position.quantity) * quote.price;
      } else {
        // For options, use current premium value
        totalValue += Math.abs(position.quantity) * quote.price * 100; // Options multiplier
      }
    }

    // Calculate day change
    const dayChange = this.calculateDayChange(positionUpdates);
    const dayChangePercent = totalValue > 0 ? (dayChange / totalValue) * 100 : 0;

    return {
      totalUnrealizedPL,
      totalRealizedPL: state.portfolio.realizedPL,
      totalValue,
      dayChange,
      dayChangePercent,
      positions: positionUpdates,
      timestamp: Date.now()
    };
  }

  /**
   * Calculate P&L for a single position
   */
  private calculatePositionPL(position: Position, currentPrice: number): PLUpdate {
    let unrealizedPL = 0;
    let percentChange = 0;

    if (position.type === 'stock') {
      // Stock P&L calculation
      const costBasis = position.purchasePrice * Math.abs(position.quantity);
      const currentValue = currentPrice * Math.abs(position.quantity);
      
      if (position.positionType === 'long') {
        unrealizedPL = currentValue - costBasis;
      } else {
        unrealizedPL = costBasis - currentValue;
      }
      
      percentChange = position.purchasePrice > 0 ? 
        ((currentPrice - position.purchasePrice) / position.purchasePrice) * 100 : 0;
        
    } else {
      // Options P&L calculation
      const multiplier = 100; // Options contract multiplier
      const costBasis = position.purchasePrice * Math.abs(position.quantity) * multiplier;
      const currentValue = currentPrice * Math.abs(position.quantity) * multiplier;
      
      if (position.positionType === 'long') {
        unrealizedPL = currentValue - costBasis;
      } else {
        // Short options: profit when premium decreases
        unrealizedPL = costBasis - currentValue;
      }
      
      percentChange = position.purchasePrice > 0 ? 
        ((currentPrice - position.purchasePrice) / position.purchasePrice) * 100 : 0;
    }

    return {
      positionId: position.id,
      symbol: position.symbol,
      currentPrice,
      unrealizedPL: Math.round(unrealizedPL * 100) / 100, // Round to cents
      percentChange: Math.round(percentChange * 100) / 100,
      timestamp: Date.now()
    };
  }

  /**
   * Calculate day change across all positions
   */
  private calculateDayChange(positionUpdates: PLUpdate[]): number {
    let totalDayChange = 0;

    for (const update of positionUpdates) {
      const lastPrice = this.lastPrices.get(update.symbol);
      if (lastPrice && lastPrice !== update.currentPrice) {
        const priceChange = update.currentPrice - lastPrice;
        // This is a simplified calculation - in reality you'd need opening prices
        totalDayChange += priceChange;
      }
      
      // Update last known price
      this.lastPrices.set(update.symbol, update.currentPrice);
    }

    return totalDayChange;
  }

  /**
   * Update portfolio P&L and notify subscribers
   */
  private async updatePortfolioPL(): Promise<void> {
    try {
      const portfolioSummary = await this.getCurrentPortfolioPL();
      
      // Update Redux store
      store.dispatch(updatePortfolioPL({
        unrealizedPL: portfolioSummary.totalUnrealizedPL,
        totalValue: portfolioSummary.totalValue
      }));

      // Update individual positions
      for (const positionUpdate of portfolioSummary.positions) {
        store.dispatch(updatePositionPL({
          positionId: positionUpdate.positionId,
          currentPrice: positionUpdate.currentPrice,
          unrealizedPL: positionUpdate.unrealizedPL
        }));
      }

      // Notify subscribers
      this.subscribers.forEach(callback => {
        try {
          callback(portfolioSummary);
        } catch (error) {
          console.error('[RealTimePL] Error in subscriber callback:', error);
        }
      });

      console.log(`[RealTimePL] Updated portfolio: $${portfolioSummary.totalUnrealizedPL.toFixed(2)} unrealized P&L`);
      
    } catch (error) {
      console.error('[RealTimePL] Failed to update portfolio P&L:', error);
    }
  }

  /**
   * Force an immediate P&L update
   */
  public async forceUpdate(): Promise<void> {
    await this.updatePortfolioPL();
  }

  /**
   * Get service status
   */
  public getStatus(): { isRunning: boolean; updateFrequency: number; subscriberCount: number } {
    return {
      isRunning: this.isRunning,
      updateFrequency: this.updateFrequency,
      subscriberCount: this.subscribers.size
    };
  }

  /**
   * Change update frequency
   */
  public setUpdateFrequency(frequencyMs: number): void {
    this.updateFrequency = frequencyMs;
    
    if (this.isRunning) {
      this.stop();
      this.start(frequencyMs);
    }
  }

  /**
   * Get P&L for a specific position
   */
  public async getPositionPL(positionId: string): Promise<PLUpdate | null> {
    const state = store.getState();
    const position = state.portfolio.positions.find(p => p.id === positionId);
    
    if (!position) {
      return null;
    }

    try {
      const quote = await this.marketDataService.getStockQuote(position.symbol);
      return this.calculatePositionPL(position, quote.price);
    } catch (error) {
      console.error(`Failed to get P&L for position ${positionId}:`, error);
      return null;
    }
  }
}