import { createAsyncThunk } from '@reduxjs/toolkit';
import { TradeService } from '../services/TradeService';
import * as RiskService from '../services/RiskService';
import { executeTrade, setTradeError, setCustomStrategy, addStrategy, updateStrategyPL } from './tradingSlice';
import type { RootState } from './store';
import type { OptionLeg } from './tradingSlice';
import type { ETFStrategyConfig } from './types';

/**
 * Validates ETF strategy parameters
 * @param config Strategy configuration
 * @returns Array of validation errors (empty if valid)
 */
function validateStrategy(config: ETFStrategyConfig): string[] {
  const errors: string[] = [];
  
  // Validate required properties
  if (!config.symbol || config.symbol.trim() === '') {
    errors.push('ETF symbol is required');
  }
  
  if (!config.quantity || config.quantity <= 0) {
    errors.push('Quantity must be positive');
  }
  
  if (!config.strike || config.strike <= 0) {
    errors.push('Strike price must be positive');
  }
  
  if (!config.expiry || isNaN(Date.parse(config.expiry))) {
    errors.push('Invalid expiry date');
  }
  
  // Validate type-specific requirements
  if (config.type === 'collar' && (!config.putStrike || config.putStrike <= 0)) {
    errors.push('Put strike must be specified for collar strategy');
  }
  
  return errors;
}

/**
 * Applies ETF strategy with validation and simulation support
 */
export const applyETFStrategy = createAsyncThunk(
  'etfStrategy/apply',
  async (
    { strategyConfig, simulate = false }: { strategyConfig: ETFStrategyConfig; simulate?: boolean },
    { dispatch, getState }
  ) => {
    // Validate strategy parameters
    const validationErrors = validateStrategy(strategyConfig);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }
    
    // Calculate margin requirement
    const state = getState() as RootState;
    // Ensure required properties exist before margin calculation
    if (!strategyConfig.symbol || !strategyConfig.quantity || !strategyConfig.strike || !strategyConfig.expiry) {
      throw new Error('Missing required strategy parameters for margin calculation');
    }
    
    const marginUsed = await TradeService.calculateMargin({
      ...strategyConfig,
      name: strategyConfig.name || 'Custom Strategy',
      legs: strategyConfig.legs || []
    }, state);
    
    if (simulate) {
      // In simulation mode, add to strategies without executing
      const strategyId = `sim-${Date.now()}`;
      
      // Calculate risk metrics
      const riskMetrics = {
        earlyAssignmentProb: RiskService.calculateEarlyAssignmentProbability(
          'call', // TODO: Determine actual option type from strategy
          100,    // Placeholder underlying price
          strategyConfig.strike,
          0.25,   // Placeholder time to expiry (3 months)
          0.20     // Placeholder volatility
        ),
        volatilityImpact: await RiskService.calculateVolatilityImpact(strategyConfig.type, strategyConfig.symbol, 10),
        dividendRisk: RiskService.calculateDividendRisk(strategyConfig.symbol, strategyConfig.expiry)
      };
      
      dispatch(addStrategy({
        id: strategyId,
        name: strategyConfig.name || `${strategyConfig.type || 'Custom'} Simulation`,
        type: strategyConfig.type,
        symbol: strategyConfig.symbol,
        currentPL: 0,
        targetYield: 0.03, // 3% target
        parameters: {
          quantity: strategyConfig.quantity,
          strike: strategyConfig.strike,
          putStrike: strategyConfig.putStrike,
          expiry: strategyConfig.expiry
        },
        riskMetrics // Add risk metrics to simulation
      }));
      
      return { strategyId, marginUsed, status: 'simulated' };
    } else {
      // In live mode, execute the strategy
      dispatch(setCustomStrategy(strategyConfig));
      
      try {
        // Execute strategy based on type
        let result;
        switch(strategyConfig.type) {
          case 'covered-call':
            result = await dispatch(mstyCoveredCallThunk({ ...strategyConfig, simulate: false })).unwrap();
            break;
          case 'cash-secured-put':
            result = await dispatch(pltyCashSecuredPutThunk({ ...strategyConfig, simulate: false })).unwrap();
            break;
          case 'collar':
            result = await dispatch(tslyCollarStrategyThunk({
              ...strategyConfig,
              callStrike: strategyConfig.strike,
              simulate: false
            })).unwrap();
            break;
          default:
            throw new Error(`Unsupported strategy type: ${strategyConfig.type}`);
        }
        
        return result;
      } catch (error) {
        const errorMessage = getErrorMessage(error, 'Strategy execution failed');
        dispatch(setTradeError(errorMessage));
        throw error;
      }
    }
  }
);

// MSTY Covered Call Strategy
export const mstyCoveredCallThunk = createAsyncThunk(
  'etfStrategy/mstyCoveredCall',
  async (position: {
    symbol: string;
    quantity: number;
    strike?: number;
    expiry: string;
    simulate?: boolean
  }, { dispatch, getState, rejectWithValue }) => {
    try {
      const { symbol, quantity, strike = 0, expiry, simulate = false } = position;
      const legs: OptionLeg[] = [
        { 
          id: `${symbol}-call-${strike}-${expiry}`,
          symbol, 
          quantity, 
          optionType: 'call', 
          strike, 
          expiry, 
          action: 'sell',
          premium: 0 // Will be calculated by the trade service
        }
      ];
      
      if (simulate) {
        const marginUsed = await TradeService.calculateMargin({
          type: 'covered-call',
          symbol,
          quantity,
          strike,
          expiry
        }, getState() as RootState);
        
        return { marginUsed, status: 'simulated' };
      }
      
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
  async (position: {
    symbol: string;
    quantity: number;
    strike?: number;
    expiry: string;
    simulate?: boolean
  }, { dispatch, getState, rejectWithValue }) => {
    try {
      const { symbol, quantity, strike = 0, expiry, simulate = false } = position;
      const legs: OptionLeg[] = [
        { 
          id: `${symbol}-put-${strike}-${expiry}`,
          symbol, 
          quantity, 
          optionType: 'put', 
          strike, 
          expiry, 
          action: 'sell',
          premium: 0 // Will be calculated by the trade service
        }
      ];
      
      if (simulate) {
        const marginUsed = await TradeService.calculateMargin({
          type: 'cash-secured-put',
          symbol,
          quantity,
          strike,
          expiry
        }, getState() as RootState);
        
        return { marginUsed, status: 'simulated' };
      }
      
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
    callStrike?: number;
    putStrike?: number;
    expiry: string;
    simulate?: boolean
  }, { dispatch, getState, rejectWithValue }) => {
    try {
      const { symbol, quantity, callStrike = 0, putStrike = 0, expiry, simulate = false } = position;
      const legs: OptionLeg[] = [
        { 
          id: `${symbol}-call-${callStrike}-${expiry}`,
          symbol, 
          quantity, 
          optionType: 'call', 
          strike: callStrike, 
          expiry, 
          action: 'sell',
          premium: 0 // Will be calculated by the trade service
        },
        { 
          id: `${symbol}-put-${putStrike}-${expiry}`,
          symbol, 
          quantity, 
          optionType: 'put', 
          strike: putStrike, 
          expiry, 
          action: 'buy',
          premium: 0 // Will be calculated by the trade service
        }
      ];
      
      if (simulate) {
        // Simulation mode - calculate margin only
        const marginUsed = await TradeService.calculateMargin({
          type: 'collar',
          symbol,
          quantity,
          strike: callStrike,
          putStrike,
          expiry
        }, getState() as RootState);
        
        return { marginUsed, status: 'simulated' };
      }
      
      // Live execution
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