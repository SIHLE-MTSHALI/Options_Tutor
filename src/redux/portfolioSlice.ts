import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { OptionLeg } from './tradingSlice';
import { executeTradeThunk } from './tradingSlice';

export interface Position {
  id: string;
  symbol: string;
  type: 'call' | 'put' | 'stock';
  quantity: number;
  strike?: number;
  expiry?: string;
  purchasePrice: number;
  currentPrice: number;
}

interface PortfolioState {
  cashBalance: number;
  positions: Position[];
  unrealizedPL: number;
  realizedPL: number;
  marginUsage: number;
}

const initialState: PortfolioState = {
  cashBalance: 10000,
  positions: [],
  unrealizedPL: 0,
  realizedPL: 0,
  marginUsage: 0,
};

export const portfolioSlice = createSlice({
  name: 'portfolio',
  initialState,
  reducers: {
    addPosition: (state, action: PayloadAction<Position>) => {
      state.positions.push(action.payload);
    },
    updatePosition: (state, action: PayloadAction<Position>) => {
      const index = state.positions.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.positions[index] = action.payload;
      }
    },
    closePosition: (state, action: PayloadAction<{id: string, closePrice: number}>) => {
      const position = state.positions.find(p => p.id === action.payload.id);
      if (position) {
        const profit = (action.payload.closePrice - position.purchasePrice) * position.quantity;
        state.realizedPL += profit;
        state.cashBalance += profit;
        state.positions = state.positions.filter(p => p.id !== action.payload.id);
      }
    },
    updateMarginUsage: (state, action: PayloadAction<number>) => {
      state.marginUsage = action.payload;
    },
    updateUnrealizedPL: (state, action: PayloadAction<number>) => {
      state.unrealizedPL = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder.addCase(executeTradeThunk.fulfilled, (state, action: PayloadAction<OptionLeg[]>) => {
      const legs = action.payload;
      
      legs.forEach(leg => {
        const positionId = `${leg.symbol}-${leg.contractId}`;
        const existingPosition = state.positions.find(p => p.id === positionId);
        
        const cost = leg.quantity * leg.premium;
        const multiplier = leg.action === 'buy' ? -1 : 1;
        
        // Update cash balance (buy reduces cash, sell increases)
        state.cashBalance += cost * multiplier;
        
        if (existingPosition) {
          // Update existing position
          const newQuantity = existingPosition.quantity +
            (leg.action === 'buy' ? leg.quantity : -leg.quantity);
          
          if (newQuantity === 0) {
            // Remove position if quantity becomes zero
            state.positions = state.positions.filter(p => p.id !== positionId);
          } else {
            // Update average cost for position
            const totalCost = existingPosition.purchasePrice * existingPosition.quantity;
            existingPosition.purchasePrice =
              (totalCost + cost) / (existingPosition.quantity + leg.quantity);
            existingPosition.quantity = newQuantity;
          }
        } else if (leg.action === 'buy') {
          // Add new long position
          state.positions.push({
            id: positionId,
            symbol: leg.symbol,
            type: leg.optionType,
            quantity: leg.quantity,
            strike: leg.strike,
            expiry: leg.expiry,
            purchasePrice: leg.premium,
            currentPrice: leg.premium,
          });
        } else {
          // Add new short position
          state.positions.push({
            id: positionId,
            symbol: leg.symbol,
            type: leg.optionType,
            quantity: -leg.quantity,
            strike: leg.strike,
            expiry: leg.expiry,
            purchasePrice: leg.premium,
            currentPrice: leg.premium,
          });
        }
      });
    });
  }
});

export const { addPosition, updatePosition, closePosition, updateMarginUsage, updateUnrealizedPL } = portfolioSlice.actions;
export default portfolioSlice.reducer;
