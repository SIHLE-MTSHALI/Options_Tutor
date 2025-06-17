import { RootState } from '../redux/store';
import { addPosition } from '../redux/portfolioSlice';
import { updateStockQuote } from '../redux/marketDataSlice'; // Added
import { OptionLeg } from '../redux/tradingSlice';
import { MarginService } from './MarginService';
import { MockApiService } from './mockApiService'; // Added

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
      throw new Error('Invalid trade legs');
    }
    
    // Get underlying price (assuming all legs for same symbol)
    const symbol = legs[0].symbol;
    let underlyingPrice = state.marketData.stockQuotes[symbol]?.price;
    
    if (!underlyingPrice) {
      try {
        const quote = await MockApiService.getInstance().fetchStockQuote(symbol);
        underlyingPrice = quote.price;
        dispatch(updateStockQuote({symbol, price: quote.price}));
      } catch (e) {
        throw new Error(`Failed to fetch stock quote for ${symbol}`);
      }
    }
    
    // Calculate required margin (now async)
    const margin = await marginCalculator(legs, underlyingPrice);
    console.log(`[DEBUG] Margin required: ${margin}, cash balance: ${state.portfolio.cashBalance}`);
    
    // Ensure we have enough buying power for the trade
    if (margin > state.portfolio.cashBalance) {
      throw new Error('Insufficient buying power for trade');
    }
    
    // Execute each leg
    legs.forEach(leg => {
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
      const chain = state.marketData.optionChains[leg.symbol];
      if (!chain) return false;
      
      const expiryData = chain[leg.expiry];
      if (!expiryData) return false;
      
      // Check calls or puts based on option type
      const optionsArray = leg.optionType === 'call' ? expiryData.calls : expiryData.puts;
      const optionExists = !!optionsArray.find(option => option.strike === leg.strike);
      
      // Early assignment check for ETFs
      if (optionExists && ['MSTY', 'PLTY', 'TSLY'].includes(leg.symbol)) {
        this.handleEarlyAssignmentRisk(leg, state);
      }
      
      return optionExists;
    });
  }
  
  private static handleEarlyAssignmentRisk(leg: OptionLeg, state: RootState) {
    // Check if option is deep in the money and near expiration
    const quote = state.marketData.stockQuotes[leg.symbol];
    if (!quote) return;
    
    const isDeepITM =
      (leg.optionType === 'call' && quote.price > leg.strike * 1.1) ||
      (leg.optionType === 'put' && quote.price < leg.strike * 0.9);
    
    const daysToExpiry = (new Date(leg.expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    
    if (isDeepITM && daysToExpiry < 3) {
      console.warn(`Early assignment risk for ${leg.symbol} ${leg.optionType} ${leg.strike}`);
      // In a real system, we would trigger a notification or mitigation strategy
    }
  }
}