import { createAsyncThunk } from '@reduxjs/toolkit';
import { TradeService } from '../services/TradeService';
import { executeTrade, setTradeError } from './tradingSlice';
import type { RootState } from './store';
import type { OptionLeg } from './tradingSlice';

export const executeTradeThunk = createAsyncThunk(
  'trade/executeTrade',
  async (legs: OptionLeg[], { dispatch, getState }) => {
    try {
      const marginUsed = await TradeService.executeTrade(legs, getState as () => RootState, dispatch);
      dispatch(executeTrade({
        legs,
        marginUsed,
        status: 'completed'
      }));
      return marginUsed;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown trade error';
      dispatch(setTradeError(errorMessage));
      throw error;
    }
  }
);