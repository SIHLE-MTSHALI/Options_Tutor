import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface OptionData {
  expiry: string;
  strike: number;
  lastPrice: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  impliedVol: number;
}

export interface OptionChain {
  [strike: string]: {
    calls: OptionData[];
    puts: OptionData[];
  };
}

interface MarketDataState {
  currentPrice: number;
  volatility: number;
  optionChains: {
    [symbol: string]: OptionChain;
  };
  selectedSymbol: string;
  stockQuotes: Record<string, { price: number }>; // Added stockQuotes
}

const initialState: MarketDataState = {
  currentPrice: 150,
  volatility: 0.3,
  optionChains: {},
  selectedSymbol: 'TSLA',
  stockQuotes: {}, // Initialize as empty object
};

export const marketDataSlice = createSlice({
  name: 'marketData',
  initialState,
  reducers: {
    updatePrice: (state, action: PayloadAction<number>) => {
      state.currentPrice = action.payload;
    },
    updateVolatility: (state, action: PayloadAction<number>) => {
      state.volatility = action.payload;
    },
    updateOptionChain: (state, action: PayloadAction<{symbol: string; chain: OptionChain}>) => {
      const { symbol, chain } = action.payload;
      state.optionChains[symbol] = chain;
    },
    selectSymbol: (state, action: PayloadAction<string>) => {
      state.selectedSymbol = action.payload;
    },
    updateStockQuote: (state, action: PayloadAction<{symbol: string; price: number}>) => {
      const { symbol, price } = action.payload;
      state.stockQuotes[symbol] = { price };
    }
  },
});

export const {
  updatePrice,
  updateVolatility,
  updateOptionChain,
  selectSymbol,
  updateStockQuote // Added new action
} = marketDataSlice.actions;

export default marketDataSlice.reducer;
