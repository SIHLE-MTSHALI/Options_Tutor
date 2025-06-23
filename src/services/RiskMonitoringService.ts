import * as RiskService from './RiskService';
import * as MarginService from './MarginService';
import { Position } from '../redux/types';
import { ETFStrategyState } from '../redux/tradingSlice';
import type { MarketDataState } from '../redux/marketDataSlice';
import { OptionLeg } from '../redux/types';

/**
 * Real-time risk monitoring and adjustment service
 */
export class RiskMonitoringService {
  /**
   * Calculate real-time risk metrics for a position
   * @param position The position to analyze
   * @param marketData Current market data
   * @returns Risk metrics object
   */
  static calculatePositionRisk(
    position: Position,
    marketData: MarketDataState
  ) {
    const underlyingPrice = marketData.stockQuotes[position.symbol]?.price || 0;
    const volatility = marketData.volatility || 0.3;
    const dividendAmount = 0; // Dividend data not available in marketData
    const daysToExDiv = 0; // Dividend data not available in marketData

    return {
      delta: this.calculateDelta(position, underlyingPrice),
      gamma: this.calculateGamma(position, underlyingPrice, volatility),
      theta: this.calculateTheta(position, volatility),
      vega: this.calculateVega(position, volatility),
      earlyAssignmentProb: RiskService.calculateEarlyAssignmentProbability(
        position.type === 'call' ? 'call' : 'put',
        underlyingPrice,
        position.strike || 0,
        this.timeToExpiry(position.expiry || new Date().toISOString().split('T')[0]),
        volatility
      ),
      marginRequirement: MarginService.MarginService.calculateETFMargin(
        position.symbol,
        [this.positionToLeg(position)],
        underlyingPrice,
        dividendAmount,
        daysToExDiv
      ),
      maxLoss: MarginService.MarginService.calculateMaxLoss(position, position.stopLoss ?? null)
    };
  }

  /**
   * Calculate real-time risk metrics for an ETF strategy
   * @param strategy ETF strategy configuration
   * @param marketData Current market data
   * @returns Risk metrics object
   */
  static calculateStrategyRisk(
    strategy: ETFStrategyState,
    marketData: MarketDataState,
    cashBalance: number
  ) {
    const underlyingPrice = marketData.stockQuotes[strategy.symbol]?.price || 0;
    const volatility = marketData.volatility || 0.3;
    const dividendAmount = 0; // Dividend data not available in marketData
    const daysToExDiv = 0; // Dividend data not available in marketData

    return {
      volatilityImpact: RiskService.calculateVolatilityImpact(
        strategy.type,
        strategy.symbol,
        strategy.parameters.quantity * underlyingPrice
      ),
      dividendRisk: RiskService.calculateDividendRisk(
        strategy.symbol,
        strategy.parameters.expiry
      ),
      marginUtilization: MarginService.MarginService.calculateMarginUtilization(
        MarginService.MarginService.calculateETFMargin(
          strategy.symbol,
          [ // Build OptionLeg array from strategy parameters
            {
              id: 'main',
              optionType: strategy.type === 'cash-secured-put' ? 'put' : 'call',
              strike: strategy.parameters.strike,
              expiry: strategy.parameters.expiry,
              quantity: strategy.parameters.quantity,
              premium: 0 // Will be calculated by pricing model
            }
          ],
          underlyingPrice,
          dividendAmount,
          daysToExDiv
        ),
        cashBalance
      )
    };
  }

  /**
   * Calculate position delta
   * @param position The position
   * @param underlyingPrice Current underlying price
   * @returns Delta value
   */
  private static calculateDelta(
    position: Position,
    underlyingPrice: number
  ): number {
    if (position.type === 'stock') {
      return 1;
    }

    const inTheMoney = position.type === 'call' 
      ? underlyingPrice > (position.strike || 0)
      : underlyingPrice < (position.strike || 0);

    return position.positionType === 'long'
      ? inTheMoney ? 1 : 0
      : inTheMoney ? -1 : 0;
  }

  /**
   * Calculate position gamma
   * @param position The position
   * @param underlyingPrice Current underlying price
   * @param volatility Current volatility
   * @returns Gamma value
   */
  private static calculateGamma(
    position: Position,
    underlyingPrice: number,
    volatility: number
  ): number {
    if (position.type === 'stock') return 0;
    
    const timeToExpiry = this.timeToExpiry(position.expiry || new Date().toISOString().split('T')[0]);
    const distance = Math.abs((position.strike || 0) - underlyingPrice);
    
    return volatility * (distance / (underlyingPrice * Math.sqrt(timeToExpiry)));
  }

  /**
   * Calculate position theta
   * @param position The position
   * @param volatility Current volatility
   * @returns Theta value
   */
  private static calculateTheta(
    position: Position,
    volatility: number
  ): number {
    if (position.type === 'stock') return 0;
    return -0.05 * volatility * (position.quantity / 100);
  }

  /**
   * Calculate position vega
   * @param position The position
   * @param volatility Current volatility
   * @returns Vega value
   */
  private static calculateVega(
    position: Position,
    volatility: number
  ): number {
    if (position.type === 'stock') return 0;
    return 0.15 * volatility * (position.quantity / 100);
  }

  /**
   * Convert position to option leg
   * @param position The position
   * @returns Option leg representation
   */
  private static positionToLeg(position: Position): OptionLeg {
    return {
      id: position.id,
      symbol: position.symbol,
      optionType: position.type as 'call' | 'put',
      action: position.positionType === 'long' ? 'buy' : 'sell',
      quantity: position.quantity,
      strike: position.strike || 0,
      expiry: position.expiry || '',
      premium: position.currentPrice
    };
  }

  /**
   * Calculate time to expiry in years
   * @param expiryDate Expiry date string (YYYY-MM-DD)
   * @returns Time to expiry in years
   */
  private static timeToExpiry(expiryDate: string): number {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    return diffMs / (1000 * 60 * 60 * 24 * 365);
  }
}