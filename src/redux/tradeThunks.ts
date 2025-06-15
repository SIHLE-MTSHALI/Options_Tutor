import { createAsyncThunk } from '@reduxjs/toolkit';
import { TradeService } from '../services/TradeService';
import { executeTrade, setTradeError } from './tradingSlice';
import type { RootState } from './store';
import type { OptionLeg } from './tradingSlice';
import { HistoricalDataService } from '../services/historicalDataService';
import {
  fetchHistoricalDataStart,
  fetchHistoricalDataSuccess,
  fetchHistoricalDataFailure
} from './marketDataSlice';

export const executeTradeThunk = createAsyncThunk(
  'trade/executeTrade',
  async (legs: OptionLeg[], { dispatch, getState, rejectWithValue }) => {
    try {
      const marginUsed = await TradeService.executeTrade(legs, getState as () => RootState, dispatch);
      
      // Successful execution
      dispatch(executeTrade({
        legs,
        marginUsed,
        status: 'completed'
      }));
      return marginUsed;
    } catch (error: unknown) {
      let errorMessage = 'Trade execution failed';
      
      if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = (error as { message: string }).message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      dispatch(setTradeError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Fetch historical options data for a symbol and expiry
 * @param symbol Stock ticker symbol
 * @param expiry Option expiration date (YYYY-MM-DD)
 */
export const fetchHistoricalDataThunk = createAsyncThunk(
  'marketData/fetchHistorical',
  async ({ symbol, expiry }: { symbol: string; expiry: string }, { dispatch }) => {
    try {
      dispatch(fetchHistoricalDataStart());
      const chain = await HistoricalDataService.fetchHistoricalOptions(symbol, expiry);
      dispatch(fetchHistoricalDataSuccess({ symbol, expiry, chain }));
      return chain;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      dispatch(fetchHistoricalDataFailure(errorMessage));
      throw error;
    }
  }
);