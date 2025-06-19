import { createSlice, PayloadAction, createAsyncThunk, Draft } from '@reduxjs/toolkit';
import { RootState } from './store';
import { ETFStrategyConfig } from './types';

export interface OptionLeg {
  id?: string;
  symbol: string;
  quantity: number;
  action: 'buy' | 'sell';
  optionType?: 'call' | 'put';
  strike?: number;
  expiry?: string;
  contractId?: string;
  premium?: number;
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

// NEW: ETF strategy state
export interface ETFStrategyState {
  id: string;
  name: string;
  type: 'covered-call' | 'cash-secured-put' | 'collar' | 'custom';
  symbol: string;
  currentPL: number;
  targetYield: number;
  parameters: {
    quantity: number;
    strike: number;
    putStrike?: number;
    expiry: string;
  };
}

interface TradingState {
  selectedStrategy: Strategy | null;
  legs: OptionLeg[];
  showPayoffDiagram: boolean;
  showRiskGraph: boolean;
  tradeError: string | null;
  accountId: string;
  // NEW: ETF strategies state slice
  etfStrategies: ETFStrategyState[];
}

const initialState: TradingState = {
  selectedStrategy: null,
  legs: [],
  showPayoffDiagram: true,
  showRiskGraph: false,
  tradeError: null,
  accountId: '',
  // NEW: Initialize ETF strategies array
  etfStrategies: [],
};

export const tradingSlice = createSlice({
  name: 'trading',
  initialState,
  reducers: {
    setCustomStrategy: (state: Draft<TradingState>, action: PayloadAction<ETFStrategyConfig>) => {
      if (action.payload.legs) state.legs = action.payload.legs;
      state.selectedStrategy = {
        id: 'custom',
        name: action.payload.name || 'Custom Strategy',
        legs: action.payload.legs || [],
        maxProfit: 0,
        maxLoss: 0,
        breakEvenPoints: [],
        probabilityOfProfit: 0
      };
    },
    // NEW: Add strategy to ETF strategies
    addStrategy: (state, action: PayloadAction<ETFStrategyState>) => {
      state.etfStrategies.push(action.payload);
    },
    // NEW: Update strategy P/L
    updateStrategyPL: (state, action: PayloadAction<{ strategyId: string; pl: number }>) => {
      const strategy = state.etfStrategies.find(s => s.id === action.payload.strategyId);
      if (strategy) {
        strategy.currentPL = action.payload.pl;
      }
    },
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
    executeTrade: (state, action: PayloadAction<{ legs: OptionLeg[]; marginUsed: number; status: string; strategy?: string }>) => {
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
  setTradeError,
  setCustomStrategy,
  // NEW: Export new actions
  addStrategy,
  updateStrategyPL
} = tradingSlice.actions;

export const tradingActions = {
  addLeg,
  removeLeg,
  updateLeg,
  selectStrategy,
  togglePayoffDiagram,
  toggleRiskGraph,
  executeTrade,
  setTradeError,
  setCustomStrategy,
  // NEW: Include new actions
  addStrategy,
  updateStrategyPL
};

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
