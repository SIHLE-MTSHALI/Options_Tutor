import { createSlice, PayloadAction, createAsyncThunk, Draft } from '@reduxjs/toolkit';
import { RootState } from './store';
import { ETFStrategyConfig, OptionLeg } from './types';
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
  riskMetrics?: {
    earlyAssignmentProb: number;
    volatilityImpact: number;
    dividendRisk: number;
  };
}

export interface TradingState {
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
      // Ensure all legs have required id/premium by adding defaults
      const legsWithDefaults = (action.payload.legs || []).map(leg => ({
        ...leg,
        optionType: leg.optionType || 'call',
        id: leg.id || Date.now().toString(),
        premium: leg.premium || 0
      }));
      
      if (action.payload.legs) state.legs = legsWithDefaults;
      
      state.selectedStrategy = {
        id: 'custom',
        name: action.payload.name || 'Custom Strategy',
        legs: legsWithDefaults,
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
      // Ensure required id/premium are provided
      const legWithDefaults = {
        ...action.payload,
        optionType: action.payload.optionType || 'call',
        id: action.payload.id || Date.now().toString(),
        premium: action.payload.premium || 0
      };
      state.legs.push(legWithDefaults);
    },
    removeLeg: (state, action: PayloadAction<string>) => {
      state.legs = state.legs.filter(leg => leg.id !== action.payload);
    },
    updateLeg: (state, action: PayloadAction<{ index: number; leg: Partial<OptionLeg> }>) => {
      if (state.legs[action.payload.index]) {
        const existingLeg = state.legs[action.payload.index];
        const updatedLeg = {
          ...existingLeg,
          ...action.payload.leg,
          // Handle optionType default if missing in partial update
          optionType: action.payload.leg.optionType || existingLeg.optionType
        };
        state.legs[action.payload.index] = updatedLeg;
      }
    },
    selectStrategy: (state, action: PayloadAction<Strategy>) => {
      // Ensure all legs have required id/premium by adding defaults
      const legsWithDefaults = action.payload.legs.map(leg => ({
        ...leg,
        optionType: leg.optionType || 'call',
        id: leg.id || Date.now().toString(),
        premium: leg.premium || 0
      }));
      
      state.selectedStrategy = action.payload;
      state.legs = legsWithDefaults;
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
      // Ensure all legs have required id/premium by adding defaults
      const legsWithDefaults = legs.map(leg => ({
        ...leg,
        optionType: leg.optionType || 'call',
        id: leg.id || Date.now().toString(),
        premium: leg.premium || 0
      }));
      
      setTimeout(() => {
        dispatch(executeTrade({ legs: legsWithDefaults, marginUsed: 0, status: 'completed' }));
        resolve(legsWithDefaults);
      }, 1000);
    });
  }
);

// Re-export types for convenience
export type { OptionLeg } from './types';
export type { TradingState };

export default tradingSlice.reducer;
