/**
 * MarginService - Calculates margin requirements for options trades
 * Implements Reg T margin rules
 */
import { OptionLeg } from '../redux/tradingSlice';

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
    const optionValue = leg.premium * leg.quantity * 100;
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
}