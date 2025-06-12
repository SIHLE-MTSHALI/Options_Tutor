import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Position {
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
});

export const { addPosition, updatePosition, closePosition, updateMarginUsage, updateUnrealizedPL } = portfolioSlice.actions;
export default portfolioSlice.reducer;
