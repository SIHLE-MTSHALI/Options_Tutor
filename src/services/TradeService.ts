import { RootState } from '../redux/store';
import { addPosition } from '../redux/portfolioSlice';
import { updateStockQuote } from '../redux/marketDataSlice'; // Added
import { OptionLeg } from '../redux/tradingSlice';
import { MarginService } from './MarginService';
import { MockApiService } from './mockApiService'; // Added

export class TradeService {
  static async executeTrade(legs: OptionLeg[], getState: () => RootState, dispatch: any) { // Made async
    const state = getState();
    
    // Validate all legs
    if (!this.validateLegs(legs, state)) {
      throw new Error('Invalid trade legs');
    }
    
    // Get underlying price (assuming all legs for same symbol)
    const symbol = legs[0].symbol;
    let underlyingPrice = state.marketData.stockQuotes[symbol]?.price; // Changed to let
    
    if (!underlyingPrice) {
      try {
        const quote = await MockApiService.getInstance().fetchStockQuote(symbol); // Use singleton
        underlyingPrice = quote.price;
        dispatch(updateStockQuote({symbol, price: quote.price})); // Dispatch update
      } catch (e) {
        throw new Error(`Failed to fetch stock quote for ${symbol}`);
      }
    }
    
    // Calculate required margin using MarginService
    const margin = MarginService.calculateMargin(legs, underlyingPrice);
    
    // Check buying power
    if (margin > state.portfolio.cashBalance) {
      throw new Error('Insufficient buying power');
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
        purchasePrice: leg.premium,
        currentPrice: leg.premium,
        unrealizedPL: 0
      }));
    });
    
    return margin;
  }
  
  private static validateLegs(legs: OptionLeg[], state: RootState): boolean {
    return legs.every(leg => {
      const chain = state.marketData.optionChains[leg.symbol];
      if (!chain) return false;
      
      const expiryData = chain[leg.expiry];
      if (!expiryData) return false;
      
      // Check calls or puts based on option type
      const optionsArray = leg.optionType === 'call' ? expiryData.calls : expiryData.puts;
      return !!optionsArray.find(option => option.strike === leg.strike);
    });
  }
}