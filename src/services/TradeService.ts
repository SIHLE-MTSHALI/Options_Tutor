import { RootState } from '../redux/store';
import { addPosition } from '../redux/portfolioSlice';
import { OptionLeg } from '../redux/tradingSlice';

export class TradeService {
  static executeTrade(legs: OptionLeg[], getState: () => RootState, dispatch: any) {
    const state = getState();
    
    // Validate all legs
    if (!this.validateLegs(legs, state)) {
      throw new Error('Invalid trade legs');
    }
    
    // Calculate required margin
    const margin = legs.reduce((sum, leg) => sum + this.calculateMargin(leg, state), 0);
    
    // Check buying power
    if (margin > state.portfolio.cashBalance) {
      throw new Error('Insufficient buying power');
    }
    
    // Execute each leg
    legs.forEach(leg => {
      dispatch(addPosition({
        id: `${leg.id}-${Date.now()}`,
        symbol: 'TSLA', // Default symbol for now
        type: leg.optionType,
        quantity: leg.action === 'buy' ? leg.quantity : -leg.quantity,
        strike: leg.strike,
        expiry: leg.expiry,
        purchasePrice: leg.premium,
        currentPrice: leg.premium
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
  
  private static calculateMargin(leg: OptionLeg, state: RootState): number {
    // Simple margin calculation (premium * quantity * contract multiplier)
    return leg.premium * leg.quantity * 100;
  }
}