import { TradeService } from '../services/TradeService';
import { executeTrade, setTradeError } from './tradingSlice';
import type { AppDispatch, RootState } from './store';
import type { OptionLeg } from './tradingSlice';

export const executeTradeThunk = (legs: OptionLeg[]) =>
  async (dispatch: AppDispatch, getState: () => RootState) => {
    try {
      const marginUsed = await TradeService.executeTrade(legs, getState, dispatch);
      dispatch(executeTrade({ 
        legs, 
        marginUsed,
        status: 'completed' // Added status property
      }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown trade error';
      dispatch(setTradeError(errorMessage));
    }
  };