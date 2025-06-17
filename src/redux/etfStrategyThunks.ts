import { createAsyncThunk } from '@reduxjs/toolkit';
import { TradeService } from '../services/TradeService';
import { executeTrade, setTradeError, setCustomStrategy } from './tradingSlice';
import type { RootState } from './store';
import type { OptionLeg } from './tradingSlice';
import type { ETFStrategyConfig } from './types';

export const applyETFStrategy = createAsyncThunk(
  'etfStrategy/apply',
  async (strategyConfig: ETFStrategyConfig, { dispatch }) => {
    dispatch(setCustomStrategy(strategyConfig));
    return strategyConfig;
  }
);
// MSTY Covered Call Strategy
export const mstyCoveredCallThunk = createAsyncThunk(
  'etfStrategy/mstyCoveredCall',
  async (position: { symbol: string; quantity: number; strike: number; expiry: string }, { dispatch, getState, rejectWithValue }) => {
    try {
      const legs: OptionLeg[] = [
        { symbol: position.symbol, quantity: position.quantity, optionType: 'call', strike: position.strike, expiry: position.expiry, action: 'sell' }
      ];
      
      const marginUsed = await TradeService.executeETFTrade('MSTY', legs, getState as () => RootState, dispatch);
      
      dispatch(executeTrade({
        legs,
        marginUsed,
        status: 'completed',
        strategy: 'covered-call'
      }));
      return marginUsed;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error, 'MSTY covered call execution failed');
      dispatch(setTradeError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

// PLTY Cash-Secured Put Campaign
export const pltyCashSecuredPutThunk = createAsyncThunk(
  'etfStrategy/pltyCashSecuredPut',
  async (position: { symbol: string; quantity: number; strike: number; expiry: string }, { dispatch, getState, rejectWithValue }) => {
    try {
      const legs: OptionLeg[] = [
        { symbol: position.symbol, quantity: position.quantity, optionType: 'put', strike: position.strike, expiry: position.expiry, action: 'sell' }
      ];
      
      const marginUsed = await TradeService.executeETFTrade('PLTY', legs, getState as () => RootState, dispatch);
      
      dispatch(executeTrade({
        legs,
        marginUsed,
        status: 'completed',
        strategy: 'cash-secured-put'
      }));
      return marginUsed;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error, 'PLTY cash-secured put execution failed');
      dispatch(setTradeError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

// TSLY Collar Strategy
export const tslyCollarStrategyThunk = createAsyncThunk(
  'etfStrategy/tslyCollar',
  async (position: { 
    symbol: string; 
    quantity: number; 
    callStrike: number; 
    putStrike: number; 
    expiry: string 
  }, { dispatch, getState, rejectWithValue }) => {
    try {
      const legs: OptionLeg[] = [
        { symbol: position.symbol, quantity: position.quantity, optionType: 'call', strike: position.callStrike, expiry: position.expiry, action: 'sell' },
        { symbol: position.symbol, quantity: position.quantity, optionType: 'put', strike: position.putStrike, expiry: position.expiry, action: 'buy' }
      ];
      
      const marginUsed = await TradeService.executeETFTrade('TSLY', legs, getState as () => RootState, dispatch);
      
      dispatch(executeTrade({
        legs,
        marginUsed,
        status: 'completed',
        strategy: 'collar'
      }));
      return marginUsed;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error, 'TSLY collar strategy execution failed');
      dispatch(setTradeError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

// Helper function for error message extraction
function getErrorMessage(error: unknown, defaultMessage: string): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return (error as { message: string }).message;
  } else if (typeof error === 'string') {
    return error;
  }
  return defaultMessage;
}