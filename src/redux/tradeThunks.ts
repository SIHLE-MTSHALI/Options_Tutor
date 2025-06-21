import { createAsyncThunk } from '@reduxjs/toolkit';
import { TradeService } from '../services/TradeService';
import { executeTrade, setTradeError } from './tradingSlice';
import type { RootState } from './store';
import type { OptionLeg } from './types';
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

export const stockTradeThunk = createAsyncThunk(
  'trade/stockTrade',
  async (trade: { symbol: string; quantity: number; action: 'buy' | 'sell'; type: 'market' }, { rejectWithValue }) => {
    try {
      // Simple stock trade execution
      await TradeService.executeStockTrade(trade);
      return trade;
    } catch (error: unknown) {
      let errorMessage = 'Stock trade execution failed';
      if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = (error as { message: string }).message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      return rejectWithValue(errorMessage);
    }
  }
);

export const closePosition = createAsyncThunk(
  'trading/closePosition',
  async ({ id, closePrice }: { id: string; closePrice: number }, { getState }) => {
    const state = getState() as RootState;
    await TradeService.closePosition(id, closePrice, state.trading.accountId);
    return id;
  }
);

export const modifyPosition = createAsyncThunk(
  'trading/modifyPosition',
  async ({ id, stopLoss, takeProfit }: { id: string; stopLoss?: number; takeProfit?: number }, { getState }) => {
    const state = getState() as RootState;
    await TradeService.modifyPosition(id, stopLoss, takeProfit, state.trading.accountId);
    return { id, stopLoss, takeProfit };
  }
);

export const rollPosition = createAsyncThunk(
  'trading/rollPosition',
  async ({ positionId, newExpiry, newStrike, closeLeg, openLeg }: {
    positionId: string;
    newExpiry: string;
    newStrike: number;
    closeLeg: OptionLeg;
    openLeg: OptionLeg;
  }, { getState }) => {
    const state = getState() as RootState;
    await TradeService.rollPosition(positionId, newExpiry, newStrike, closeLeg, openLeg, state.trading.accountId);
    return { positionId, newExpiry, newStrike, closeLeg, openLeg };
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