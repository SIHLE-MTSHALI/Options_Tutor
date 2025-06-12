import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface OptionLeg {
  id: string;
  type: 'call' | 'put';
  action: 'buy' | 'sell';
  strike: number;
  expiry: string;
  quantity: number;
  premium: number;
}

interface Strategy {
  id: string;
  name: string;
  legs: OptionLeg[];
  maxProfit: number;
  maxLoss: number;
  breakEvenPoints: number[];
  probabilityOfProfit: number;
}

interface TradingState {
  selectedStrategy: Strategy | null;
  legs: OptionLeg[];
  showPayoffDiagram: boolean;
  showRiskGraph: boolean;
}

const initialState: TradingState = {
  selectedStrategy: null,
  legs: [],
  showPayoffDiagram: true,
  showRiskGraph: false,
};

export const tradingSlice = createSlice({
  name: 'trading',
  initialState,
  reducers: {
    addLeg: (state, action: PayloadAction<OptionLeg>) => {
      state.legs.push(action.payload);
    },
    removeLeg: (state, action: PayloadAction<string>) => {
      state.legs = state.legs.filter(leg => leg.id !== action.payload);
    },
    updateLeg: (state, action: PayloadAction<OptionLeg>) => {
      const index = state.legs.findIndex(l => l.id === action.payload.id);
      if (index !== -1) {
        state.legs[index] = action.payload;
      }
    },
    selectStrategy: (state, action: PayloadAction<Strategy>) => {
      state.selectedStrategy = action.payload;
      state.legs = action.payload.legs;
    },
    togglePayoffDiagram: (state) => {
      state.showPayoffDiagram = !state.showPayoffDiagram;
    },
    toggleRiskGraph: (state) => {
      state.showRiskGraph = !state.showRiskGraph;
    },
    executeTrade: (state) => {
      // Trade execution logic will be handled by middleware
      state.legs = [];
      state.selectedStrategy = null;
    }
  },
});

export const { addLeg, removeLeg, updateLeg, selectStrategy, togglePayoffDiagram, toggleRiskGraph, executeTrade } = tradingSlice.actions;
export default tradingSlice.reducer;
