/**
 * MarginService - Calculates margin requirements for options trades
 * Implements Reg T margin rules
 */
import { OptionLeg } from '../redux/tradingSlice';
import { Position } from '../redux/types';

export class MarginService {
  /**
   * Calculate total margin requirement for a set of option legs
   * @param legs Option legs in the proposed trade
   * @param underlyingPrice Current price of the underlying stock
   * @returns Total margin requirement in USD
   */
  static calculateMargin(legs: OptionLeg[], underlyingPrice: number): number {
    if (this.isSpread(legs)) {
      return this.calculateSpreadMargin(legs);
    }
    return legs.reduce((total, leg) => {
      if (leg.action === 'sell') {
        return total + this.calculateNakedMargin(leg, underlyingPrice);
      }
      return total;
    }, 0);
  }

  /**
   * Calculate margin for a naked option position
   * @param leg Option leg (must be short)
   * @param underlyingPrice Current price of the underlying stock
   * @returns Margin requirement in USD
   */
  private static calculateNakedMargin(leg: OptionLeg, underlyingPrice: number): number {
    // Reg T: Greater of:
    // 1. 100% option proceeds + 20% underlying - out of money amount
    // 2. Option proceeds + 10% underlying
    const optionValue = (leg.premium || 0) * leg.quantity * 100;
    const underlyingValue = leg.strike * leg.quantity * 100;
    
    const outOfMoneyAmount = leg.optionType === 'call'
      ? Math.max(0, leg.strike - underlyingPrice)
      : Math.max(0, underlyingPrice - leg.strike);
      
    const method1 = optionValue + (0.2 * underlyingValue) - (outOfMoneyAmount * leg.quantity * 100);
    const method2 = optionValue + (0.1 * underlyingValue);
    
    return Math.max(method1, method2);
  }

  /**
   * Calculate margin for a spread position
   * @param legs Option legs in the spread
   * @returns Margin requirement in USD
   */
  private static calculateSpreadMargin(legs: OptionLeg[]): number {
    // For spreads: Max loss of the spread
    const longLegs = legs.filter(leg => leg.action === 'buy');
    const shortLegs = legs.filter(leg => leg.action === 'sell');
    
    const maxLoss = shortLegs.reduce((total, leg) => total + (leg.strike * leg.quantity * 100), 0) -
                   longLegs.reduce((total, leg) => total + (leg.strike * leg.quantity * 100), 0);
    
    return Math.max(0, maxLoss);
  }

  /**
   * Determine if a set of legs constitutes a spread
   * @param legs Option legs
   * @returns True if the legs form a spread position
   */
  private static isSpread(legs: OptionLeg[]): boolean {
    if (legs.length !== 2) return false;
    return legs[0].action !== legs[1].action;
  }

  /**
   * Calculate ETF-specific margin requirements
   * @param etfSymbol ETF symbol (MSTY, PLTY, TSLY)
   * @param legs Option legs in the trade
   * @param stockPrice Current price of the underlying ETF
   * @returns Margin requirement in USD
   */
  static calculateETFMargin(
    etfSymbol: string,
    legs: OptionLeg[],
    stockPrice: number,
    dividendAmount: number = 0,
    daysToExDiv: number = 0
  ): number {
    let margin = 0;
    const multiplier = 100; // Options represent 100 shares
    
    // Calculate dividend risk factor (1.5x margin if within 5 days of ex-div)
    const dividendRiskFactor = daysToExDiv > 0 && daysToExDiv <= 5 ? 1.5 : 1;
    
    switch(etfSymbol) {
      case 'MSTY': { // Covered call strategy
        // No margin required since stock covers obligation
        margin = 0;
        break;
      }
        
      case 'PLTY': { // Cash-secured put strategy
        const putLeg = legs.find(leg => leg.optionType === 'put' && leg.action === 'sell');
        if (putLeg) {
          // Full strike amount required as margin
          margin = putLeg.strike * multiplier * putLeg.quantity;
        }
        break;
      }
        
      case 'TSLY': { // Collar strategy
        const shortCall = legs.find(leg => leg.optionType === 'call' && leg.action === 'sell');
        const longPut = legs.find(leg => leg.optionType === 'put' && leg.action === 'buy');
        
        if (shortCall && longPut) {
          // Base margin calculation without dividend factor
          // Base margin is the spread between short call and long put strikes
          let baseMargin = (shortCall.strike - longPut.strike) * multiplier * shortCall.quantity;
          
          // Apply minimum spread requirement (10% of stock price)
          const minSpread = stockPrice * 0.10;
          if ((shortCall.strike - longPut.strike) < minSpread) {
            baseMargin = minSpread * multiplier * shortCall.quantity;
          }
          
          // Apply dividend risk factor to the entire margin requirement
          margin = baseMargin * dividendRiskFactor;
          
          // Risk metrics
          const delta = (shortCall.strike - stockPrice) / stockPrice;
          const gamma = 0.05; // Simplified gamma calculation
          const theta = -0.03; // Daily time decay
          
          console.info(`TSLY Collar Risk: Δ=${delta.toFixed(2)}, Γ=${gamma}, Θ=${theta}`);
          
          if (dividendRiskFactor > 1) {
            console.warn(`Dividend risk: TSLY $${dividendAmount} dividend in ${daysToExDiv} days - applying ${dividendRiskFactor}x margin factor`);
          }
        
        }
        break;
      }
        
      default:
        // For non-ETF covered calls, no margin required
        const callLeg = legs.find(leg => leg.optionType === 'call' && leg.action === 'sell');
        if (callLeg) {
          margin = 0;
        } else {
          // For other non-ETF strategies, use standard margin calculation
          margin = this.calculateMargin(legs, stockPrice);
        }
    }
    
    return margin;
  }

  /**
   * Calculate maximum potential loss for a position with a given stop loss
   * @param position The position to calculate max loss for
   * @param newStopLoss The proposed stop loss price (null if removing stop loss)
   * @returns Maximum potential loss in USD
   */
  static calculateMaxLoss(position: Position, newStopLoss: number | null): number {
    const quantity = Math.abs(position.quantity);
    const multiplier = 100; // Options represent 100 shares

    // Handle stock positions
    if (position.type === 'stock') {
      if (newStopLoss === null) {
        // No stop loss - max loss is entire position value
        return position.currentPrice * quantity;
      }
      
      // Calculate loss from current price to stop loss
      return (position.currentPrice - newStopLoss) * quantity;
    }

    // Handle option positions
    if (position.type === 'call' || position.type === 'put') {
      if (position.positionType === 'long') {
        // Long options: max loss is premium paid
        return position.purchasePrice * multiplier * quantity;
      } else {
        // Short options: calculate max loss based on stop loss
        if (newStopLoss === null) {
          // No stop loss - max loss is theoretically unlimited
          return Number.MAX_SAFE_INTEGER;
        }

        if (position.type === 'call') {
          // Short call: loss when underlying rises above strike
          return (newStopLoss - position.strike) * multiplier * quantity;
        } else {
          // Short put: loss when underlying falls below strike
          return (position.strike - newStopLoss) * multiplier * quantity;
        }
      }
    }

    return 0;
  }

  /**
   * Calculate margin utilization percentage and trigger warnings
   * @param marginRequirement The margin required for the current trade
   * @param cashBalance The current cash balance in the account
   * @returns Object containing utilization percentage and warning status
   */
  static calculateMarginUtilization(
    marginRequirement: number,
    cashBalance: number
  ): { utilization: number; status: 'safe' | 'amber' | 'red' } {
    if (cashBalance <= 0) {
      return { utilization: 100, status: 'red' };
    }

    const utilization = (marginRequirement / cashBalance) * 100;
    let status: 'safe' | 'amber' | 'red' = 'safe';

    if (utilization >= 80) {
      status = 'red';
      console.warn(`Margin utilization RED ZONE: ${utilization.toFixed(2)}%`);
    } else if (utilization >= 60) {
      status = 'amber';
      console.warn(`Margin utilization AMBER WARNING: ${utilization.toFixed(2)}%`);
    }

    return { utilization, status };
  }
}