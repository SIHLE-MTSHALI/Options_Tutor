import { RootState } from '../redux/store';
import { addPosition } from '../redux/portfolioSlice';
import { updateStockQuote } from '../redux/marketDataSlice';
import { OptionLeg } from '../redux/types';
import { Position, ETFStrategyConfig } from '../redux/types'; // Added ETFStrategyConfig
import { MarginService } from './MarginService';
import { MockApiService } from './mockApiService';
import { TradeExecutionError } from './errors/TradeExecutionError';

export class TradeService {
  static async executeTrade(legs: OptionLeg[], getState: () => RootState, dispatch: any) {
    return this._executeTradeCore(legs, getState, dispatch, async (legs, price) =>
      MarginService.calculateMargin(legs, price)
    );
  }

  static async executeETFTrade(etfSymbol: string, legs: OptionLeg[], getState: () => RootState, dispatch: any) {
    return this._executeTradeCore(legs, getState, dispatch, async (legs, price) => {
      try {
        const dividendData = await MockApiService.getInstance().fetchDividendData(etfSymbol);
        return MarginService.calculateETFMargin(
          etfSymbol,
          legs,
          price,
          dividendData.amount,
          dividendData.daysToExDiv
        );
      } catch (e) {
        console.error(`Failed to fetch dividend data for ${etfSymbol}, using default values`);
        return MarginService.calculateETFMargin(etfSymbol, legs, price, 0, 0);
      }
    });
  }

  static async executeCoveredCallStrategy(
    etfSymbol: string,
    callStrike: number,
    expiry: string,
    quantity: number,
    getState: () => RootState,
    dispatch: any
  ): Promise<number> {
    // Calculate realistic premium for the call option
    const state = getState();
    const underlyingPrice = state.marketData.stockQuotes[etfSymbol]?.price || 100;
    const callPremium = this.calculateOptionPremium('call', underlyingPrice, callStrike, expiry);
    
    const legs: OptionLeg[] = [{
      id: `covered-call-${etfSymbol}-${callStrike}-${expiry}-${Date.now()}`,
      symbol: etfSymbol,
      action: 'sell',
      quantity,
      optionType: 'call',
      strike: callStrike,
      expiry,
      premium: callPremium
    }];
    const margin = await this.executeETFTrade(etfSymbol, legs, getState, dispatch);
    
    // Calculate and log margin utilization
    const cashBalance = getState().portfolio.cashBalance;
    const { utilization, status } = MarginService.calculateMarginUtilization(margin, cashBalance);
    if (status !== 'safe') {
      console.warn(`Covered call strategy for ${etfSymbol} margin utilization: ${utilization.toFixed(2)}% (${status})`);
    }
    
    return margin;
  }

  static async executePutSellingStrategy(
    etfSymbol: string,
    putStrike: number,
    expiry: string,
    quantity: number,
    getState: () => RootState,
    dispatch: any
  ): Promise<number> {
    // Calculate realistic premium for the put option
    const state = getState();
    const underlyingPrice = state.marketData.stockQuotes[etfSymbol]?.price || 100;
    const putPremium = this.calculateOptionPremium('put', underlyingPrice, putStrike, expiry);
    
    const legs: OptionLeg[] = [{
      id: `put-selling-${etfSymbol}-${putStrike}-${expiry}-${Date.now()}`,
      symbol: etfSymbol,
      action: 'sell',
      quantity,
      optionType: 'put',
      strike: putStrike,
      expiry,
      premium: putPremium
    }];
    const margin = await this.executeETFTrade(etfSymbol, legs, getState, dispatch);
    
    // Calculate and log margin utilization
    const cashBalance = getState().portfolio.cashBalance;
    const { utilization, status } = MarginService.calculateMarginUtilization(margin, cashBalance);
    if (status !== 'safe') {
      console.warn(`Put selling strategy for ${etfSymbol} margin utilization: ${utilization.toFixed(2)}% (${status})`);
    }
    
    return margin;
  }

  static async executeCollarStrategy(
    etfSymbol: string,
    callStrike: number,
    putStrike: number,
    expiry: string,
    quantity: number,
    getState: () => RootState,
    dispatch: any
  ): Promise<number> {
    // Calculate realistic premiums for both options
    const state = getState();
    const underlyingPrice = state.marketData.stockQuotes[etfSymbol]?.price || 100;
    const putPremium = this.calculateOptionPremium('put', underlyingPrice, putStrike, expiry);
    const callPremium = this.calculateOptionPremium('call', underlyingPrice, callStrike, expiry);
    
    const legs: OptionLeg[] = [
      {
        id: `collar-put-${etfSymbol}-${putStrike}-${expiry}-${Date.now()}`,
        symbol: etfSymbol,
        action: 'buy',
        quantity,
        optionType: 'put',
        strike: putStrike,
        expiry,
        premium: putPremium
      },
      {
        id: `collar-call-${etfSymbol}-${callStrike}-${expiry}-${Date.now()}`,
        symbol: etfSymbol,
        action: 'sell',
        quantity,
        optionType: 'call',
        strike: callStrike,
        expiry,
        premium: callPremium
      }
    ];
    const margin = await this.executeETFTrade(etfSymbol, legs, getState, dispatch);
    
    // Calculate and log margin utilization
    const cashBalance = getState().portfolio.cashBalance;
    const { utilization, status } = MarginService.calculateMarginUtilization(margin, cashBalance);
    if (status !== 'safe') {
      console.warn(`Collar strategy for ${etfSymbol} margin utilization: ${utilization.toFixed(2)}% (${status})`);
    }
    
    return margin;
  }

  static async calculateMargin(
    strategy: ETFStrategyConfig,
    state: RootState
  ): Promise<number> {
    // Get underlying price first for premium calculations
    const symbol = strategy.symbol;
    const underlyingPrice = state.marketData.stockQuotes[symbol]?.price;
    if (underlyingPrice === undefined) {
      throw TradeExecutionError.marketDataUnavailable(symbol);
    }
    
    // Create legs based on strategy type with proper premiums
    let legs: OptionLeg[] = [];
    
    switch(strategy.type) {
      case 'covered-call':
        legs = [
          {
            id: `covered-call-${strategy.symbol}-${strategy.strike}-${strategy.expiry}-${Date.now()}`,
            symbol: strategy.symbol,
            quantity: strategy.quantity,
            optionType: 'call',
            strike: strategy.strike,
            expiry: strategy.expiry,
            action: 'sell',
            premium: this.calculateOptionPremium('call', underlyingPrice, strategy.strike, strategy.expiry)
          }
        ];
        break;
      case 'cash-secured-put':
        legs = [
          {
            id: `cash-secured-put-${strategy.symbol}-${strategy.strike}-${strategy.expiry}-${Date.now()}`,
            symbol: strategy.symbol,
            quantity: strategy.quantity,
            optionType: 'put',
            strike: strategy.strike,
            expiry: strategy.expiry,
            action: 'sell',
            premium: this.calculateOptionPremium('put', underlyingPrice, strategy.strike, strategy.expiry)
          }
        ];
        break;
      case 'collar':
        legs = [
          {
            id: `collar-call-${strategy.symbol}-${strategy.strike}-${strategy.expiry}-${Date.now()}`,
            symbol: strategy.symbol,
            quantity: strategy.quantity,
            optionType: 'call',
            strike: strategy.strike,
            expiry: strategy.expiry,
            action: 'sell',
            premium: this.calculateOptionPremium('call', underlyingPrice, strategy.strike, strategy.expiry)
          },
          {
            id: `collar-put-${strategy.symbol}-${strategy.putStrike!}-${strategy.expiry}-${Date.now()}`,
            symbol: strategy.symbol,
            quantity: strategy.quantity,
            optionType: 'put',
            strike: strategy.putStrike!,
            expiry: strategy.expiry,
            action: 'buy',
            premium: this.calculateOptionPremium('put', underlyingPrice, strategy.putStrike!, strategy.expiry)
          }
        ];
        break;
      default:
        throw TradeExecutionError.fromValidation(`Unsupported strategy type: ${strategy.type}`);
    }
    
    try {
      const dividendData = await MockApiService.getInstance().fetchDividendData(symbol);
      return MarginService.calculateETFMargin(
        symbol,
        legs,
        underlyingPrice,
        dividendData.amount,
        dividendData.daysToExDiv
      );
    } catch (e) {
      console.error(`Failed to fetch dividend data for ${symbol}, using default values`);
      return MarginService.calculateETFMargin(symbol, legs, underlyingPrice, 0, 0);
    }
  }

  private static async _executeTradeCore(
    legs: OptionLeg[],
    getState: () => RootState,
    dispatch: any,
    marginCalculator: (legs: OptionLeg[], price: number) => Promise<number>
    // Now handles both ETF and non-ETF margin calculations asynchronously
  ) {
    const state = getState();
    
    // Validate all legs
    if (!this.validateLegs(legs, state)) {
      throw TradeExecutionError.fromValidation('Invalid trade legs - validation failed');
    }
    
    // Get underlying price (assuming all legs for same symbol)
    const symbol = legs[0].symbol;
    let underlyingPrice = state.marketData.stockQuotes[symbol]?.price;
    
    if (!underlyingPrice) {
      try {
        // Try real market data first, fallback to mock
        const { getCurrentPrice } = await import('./marketDataService');
        underlyingPrice = await getCurrentPrice(symbol);
        dispatch(updateStockQuote({symbol, price: underlyingPrice}));
      } catch (e) {
        console.warn(`Real market data failed for ${symbol}, trying mock service`);
        try {
          const quote = await MockApiService.getInstance().fetchStockQuote(symbol);
          underlyingPrice = quote.price;
          dispatch(updateStockQuote({symbol, price: quote.price}));
        } catch (mockError) {
          throw TradeExecutionError.marketDataUnavailable(symbol);
        }
      }
    }
    
    // Calculate required margin (now async)
    const margin = await marginCalculator(legs, underlyingPrice);
    console.log(`[DEBUG] Margin required: ${margin}, cash balance: ${state.portfolio.cashBalance}`);
    
    // Ensure we have enough buying power for the trade
    if (margin > state.portfolio.cashBalance) {
      throw TradeExecutionError.insufficientFunds(margin, state.portfolio.cashBalance);
    }
    
    // Execute each leg
    legs.forEach(leg => {
      // Ensure required fields are present
      if (!leg.optionType || leg.strike === undefined || !leg.expiry) {
        throw TradeExecutionError.fromValidation(`Invalid leg data: missing required fields`);
      }

      dispatch(addPosition({
        id: `${leg.id}-${Date.now()}`,
        symbol: symbol,
        type: leg.optionType,
        quantity: leg.action === 'buy' ? leg.quantity : -leg.quantity,
        strike: leg.strike,
        expiry: leg.expiry,
        purchasePrice: leg.premium || 0,  // Default to 0 if premium not provided
        currentPrice: leg.premium || 0,    // Default to 0 if premium not provided
        unrealizedPL: 0,
        positionType: leg.action === 'buy' ? 'long' : 'short'
      }));
    });
    
    return margin;
  }

  static async executeStockTrade(trade: { symbol: string; quantity: number; action: 'buy' | 'sell'; type: 'market' }): Promise<void> {
  try {
    // Simple stock trade execution without margin calculations
    await MockApiService.getInstance().executeStockTrade(trade);
  } catch (error) {
    throw new Error(`Stock trade execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
  
  private static validateLegs(legs: OptionLeg[], state: RootState): boolean {
    return legs.every(leg => {
      // Validate required fields first
      if (!leg.expiry || leg.strike === undefined || !leg.optionType || !leg.action) {
        console.error(`Missing required fields for leg: ${JSON.stringify(leg)}`);
        return false;
      }

      // Validate expiry date format
      const expiryDate = new Date(leg.expiry);
      if (isNaN(expiryDate.getTime())) {
        console.error(`Invalid expiry date: ${leg.expiry}`);
        return false;
      }

      // Validate strike price is positive
      if (leg.strike <= 0) {
        console.error(`Invalid strike price: ${leg.strike}`);
        return false;
      }

      // Validate quantity is positive
      if (leg.quantity <= 0) {
        console.error(`Invalid quantity: ${leg.quantity}`);
        return false;
      }

      // Check option chains if available (for real market data)
      const chain = state.marketData.optionChains[leg.symbol];
      if (chain) {
        const expiryData = chain[leg.expiry];
        if (expiryData) {
          const optionsArray = leg.optionType === 'call' ? expiryData.calls : expiryData.puts;
          const optionExists = !!optionsArray.find(option => option.strike === leg.strike);
          if (!optionExists) {
            console.warn(`Option not found in chain: ${leg.symbol} ${leg.optionType} ${leg.strike} ${leg.expiry}`);
            // Don't fail validation for missing option chains in simulation mode
          }
        }
      }
      
      // Early assignment check for ETFs
      if (['MSTY', 'PLTY', 'TSLY'].includes(leg.symbol)) {
        this.handleEarlyAssignmentRisk(leg, state);
      }
      
      return true; // Pass validation if basic checks pass
    });
  }
  
  private static handleEarlyAssignmentRisk(leg: OptionLeg, state: RootState) {
    // Check if option is deep in the money and near expiration
    const quote = state.marketData.stockQuotes[leg.symbol];
    if (!quote) return;
    
    // Validate required fields before proceeding
    if (!leg.optionType || leg.strike === undefined || !leg.expiry) {
      console.error(`Invalid leg data: ${JSON.stringify(leg)}`);
      return;
    }

    const expiryDate = new Date(leg.expiry);
    if (isNaN(expiryDate.getTime())) {
      console.error(`Invalid expiry date: ${leg.expiry}`);
      return;
    }
    
    const isDeepITM =
      (leg.optionType === 'call' && quote.price > leg.strike * 1.1) ||
      (leg.optionType === 'put' && quote.price < leg.strike * 0.9);
      
    const daysToExpiry = (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    
    if (isDeepITM && daysToExpiry < 3) {
      console.warn(`Early assignment risk for ${leg.symbol} ${leg.optionType} ${leg.strike}`);
      // In a real system, we would trigger a notification or mitigation strategy
    }
  }
  static async closePosition(id: string, closePrice: number, accountId: string): Promise<void> {
    console.log(`Closing position ${id} at ${closePrice} for account ${accountId}`);
    // In a real implementation, this would call a brokerage API with close price
    return new Promise((resolve) => setTimeout(resolve, 1000));
  }

  static async modifyPosition(id: string, stopLoss: number | undefined, takeProfit: number | undefined, accountId: string): Promise<void> {
    console.log(`Modifying position ${id} for account ${accountId}:`, { stopLoss, takeProfit });
    // In a real implementation, this would call a brokerage API
    return new Promise((resolve) => setTimeout(resolve, 1000));
  }

  static async rollPosition(
    positionId: string,
    newExpiry: string,
    newStrike: number,
    closeLeg: OptionLeg,
    openLeg: OptionLeg,
    accountId: string
  ): Promise<void> {
    console.log(`Rolling position ${positionId} for account ${accountId} to ${newExpiry} ${newStrike}`);
    console.log('Closing leg:', closeLeg);
    console.log('Opening leg:', openLeg);
    // In a real implementation, this would call a brokerage API
    return new Promise((resolve) => setTimeout(resolve, 1000));
  }

  static validatePositionModification(
    position: Position,
    newStopLoss: number | null,
    newTakeProfit: number | null,
    accountMargin: number
  ): string | null {
    // Validate stopLoss/takeProfit values
    if (newStopLoss !== null && newStopLoss >= position.currentPrice) {
      return 'Stop loss must be below current price';
    }
    
    if (newTakeProfit !== null && newTakeProfit <= position.currentPrice) {
      return 'Take profit must be above current price';
    }

    // Calculate potential max loss
    const maxLoss = MarginService.calculateMaxLoss(position, newStopLoss);
    
    // Check against account margin
    if (maxLoss > accountMargin * 0.5) {
      return 'Modification would exceed 50% of available margin';
    }

    return null;
  }

  /**
   * Calculate realistic option premium using simplified Black-Scholes approximation
   * @param optionType 'call' or 'put'
   * @param underlyingPrice Current price of underlying
   * @param strike Strike price of option
   * @param expiry Expiry date string
   * @returns Estimated premium per share
   */
  private static calculateOptionPremium(
    optionType: 'call' | 'put',
    underlyingPrice: number,
    strike: number,
    expiry: string
  ): number {
    try {
      const expiryDate = new Date(expiry);
      const now = new Date();
      const timeToExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365); // Years
      
      if (timeToExpiry <= 0) {
        // Expired option
        return Math.max(0, optionType === 'call' ? underlyingPrice - strike : strike - underlyingPrice);
      }
      
      // Simplified premium calculation
      const volatility = 0.25; // 25% assumed volatility
      const riskFreeRate = 0.03; // 3% risk-free rate
      
      // Intrinsic value
      const intrinsicValue = Math.max(0, 
        optionType === 'call' ? underlyingPrice - strike : strike - underlyingPrice
      );
      
      // Time value (simplified)
      const timeValue = Math.sqrt(timeToExpiry) * volatility * underlyingPrice * 0.4;
      
      return Math.max(0.01, intrinsicValue + timeValue); // Minimum $0.01 premium
    } catch (error) {
      console.error('Error calculating option premium:', error);
      return 1.0; // Default premium
    }
  }
}