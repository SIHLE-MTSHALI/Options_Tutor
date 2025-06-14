import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from './store';

export interface OptionLeg {
  id: string;
  optionType: 'call' | 'put';
  symbol: string;
  contractId: string;
  action: 'buy' | 'sell';
  strike: number;
  expiry: string;
  quantity: number;
  premium: number;
  type: 'call' | 'put'; // Added type property
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
  tradeError: string | null;
}

const initialState: TradingState = {
  selectedStrategy: null,
  legs: [],
  showPayoffDiagram: true,
  showRiskGraph: false,
  tradeError: null,
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
    executeTrade: (state, action: PayloadAction<{ legs: OptionLeg[]; marginUsed: number; status: string }>) => {
      state.legs = [];
      state.selectedStrategy = null;
      state.tradeError = null;
    },
    setTradeError: (state, action: PayloadAction<string>) => {
      state.tradeError = action.payload;
    }
  },
});

export const {
  addLeg,
  removeLeg,
  updateLeg,
  selectStrategy,
  togglePayoffDiagram,
  toggleRiskGraph,
  executeTrade,
  setTradeError
} = tradingSlice.actions;

export const executeTradeThunk = createAsyncThunk(
  'trading/executeTrade',
  async (legs: OptionLeg[], { dispatch, getState }) => {
    const state = getState() as RootState;
    
    return new Promise<OptionLeg[]>((resolve) => {
      setTimeout(() => {
        dispatch(executeTrade({ legs, marginUsed: 0, status: 'completed' }));
        resolve(legs);
      }, 1000);
    });
  }
);

export default tradingSlice.reducer;
