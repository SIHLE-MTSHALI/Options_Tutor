import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { OptionLeg } from './types';
import { executeTradeThunk } from './tradingSlice';
import { realTimeService } from '../services/realTimeService';

export interface Position {
  id: string;
  symbol: string;
  type: 'call' | 'put' | 'stock';
  positionType: 'long' | 'short';
  quantity: number;
  strike?: number;
  expiry?: string;
  purchasePrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  unrealizedPL: number;
  lastUpdated?: string;
  strategyId?: string; // Added to track ETF strategy association
}

export interface PortfolioState {
  cashBalance: number;
  positions: Position[];
  strategies: any[]; // ETF strategies - using any[] for now to avoid circular imports
  unrealizedPL: number;
  realizedPL: number;
  marginUsage: number;
  isPending: boolean;
  priceUpdateTimestamp: number;
  // Performance metrics
  updatesPerSecond: number;
  lastSecondUpdates: number;
  maxUpdatesPerSecond: number;
  lastUpdateTime: number;
  strategyProfitLoss: { [strategyId: string]: number }; // Track P/L per strategy
}

export const initialState: PortfolioState = {
  cashBalance: 10000,
  positions: [],
  strategies: [],
  unrealizedPL: 0,
  realizedPL: 0,
  marginUsage: 0,
  isPending: false,
  priceUpdateTimestamp: 0,
  updatesPerSecond: 0,
  lastSecondUpdates: 0,
  maxUpdatesPerSecond: 0,
  lastUpdateTime: Date.now(),
  strategyProfitLoss: {}, // Initialize empty strategy P/L tracker
};

// Helper to calculate position P&L
const calculatePositionPL = (position: Position): number => {
  return (position.currentPrice - position.purchasePrice) * position.quantity;
};

// Helper to calculate portfolio unrealized P&L
const calculatePortfolioPL = (positions: Position[]): number => {
  return positions.reduce((sum, position) => sum + calculatePositionPL(position), 0);
};

export const portfolioSlice = createSlice({
  name: 'portfolio',
  initialState,
  reducers: {
    addPosition: (state, action: PayloadAction<Position>) => {
      const position = action.payload;
      state.positions.push(position);
      
      // Subscribe to real-time updates for this symbol
      realTimeService.subscribe(position.symbol);
      
      // Update portfolio P&L
      state.unrealizedPL = calculatePortfolioPL(state.positions);
      if (position.strategyId) {
        state.strategyProfitLoss[position.strategyId] =
          (state.strategyProfitLoss[position.strategyId] || 0) + position.unrealizedPL;
      }
    },
    updatePosition: (state, action: PayloadAction<Position>) => {
      const index = state.positions.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.positions[index] = action.payload;
        state.unrealizedPL = calculatePortfolioPL(state.positions);
        if (state.positions[index].strategyId) {
          state.strategyProfitLoss[state.positions[index].strategyId] =
            (state.strategyProfitLoss[state.positions[index].strategyId] || 0) +
            (action.payload.unrealizedPL - state.positions[index].unrealizedPL);
        }
      }
    },
    updatePositionPrice: (state, action: PayloadAction<{ symbol: string; price: number; timestamp: number }>) => {
      const { symbol, price, timestamp } = action.payload;
      
      state.positions.forEach(position => {
        if (position.symbol === symbol) {
          // Capture previous PL before updating
          const previousPL = position.unrealizedPL;
          position.currentPrice = price;
          position.unrealizedPL = calculatePositionPL(position);
          position.lastUpdated = new Date(timestamp).toISOString();
          
          // Update strategy P/L with actual change
          if (position.strategyId) {
            const plChange = position.unrealizedPL - previousPL;
            state.strategyProfitLoss[position.strategyId] =
              (state.strategyProfitLoss[position.strategyId] || 0) + plChange;
          }
        }
      });
      
      state.unrealizedPL = calculatePortfolioPL(state.positions);
      state.priceUpdateTimestamp = timestamp;
    },
    
    batchUpdatePositionPrices: (state, action: PayloadAction<Array<{ symbol: string; price: number; timestamp: number }>>) => {
      const updates = action.payload;
      const now = Date.now();
      
      updates.forEach(update => {
        state.positions.forEach(position => {
          if (position.symbol === update.symbol) {
            // Capture previous PL before updating
            const previousPL = position.unrealizedPL;
            position.currentPrice = update.price;
            position.unrealizedPL = calculatePositionPL(position);
            position.lastUpdated = new Date(update.timestamp).toISOString();
            
            // Update strategy P/L with actual change
            if (position.strategyId) {
              const plChange = position.unrealizedPL - previousPL;
              state.strategyProfitLoss[position.strategyId] =
                (state.strategyProfitLoss[position.strategyId] || 0) + plChange;
            }
          }
        });
      });
      
      state.unrealizedPL = calculatePortfolioPL(state.positions);
      state.priceUpdateTimestamp = now;
      
      // Update performance metrics
      if (now - state.lastUpdateTime < 1000) {
        state.lastSecondUpdates += updates.length;
      } else {
        state.updatesPerSecond = state.lastSecondUpdates;
        state.maxUpdatesPerSecond = Math.max(state.maxUpdatesPerSecond, state.lastSecondUpdates);
        state.lastSecondUpdates = updates.length;
        state.lastUpdateTime = now;
        
        // Log performance metrics
        console.log(`[Performance] Updates: ${updates.length} | Per Second: ${state.updatesPerSecond} | Max: ${state.maxUpdatesPerSecond}`);
      }
    },
    modifyPosition: (state, action: PayloadAction<{ id: string; stopLoss?: number; takeProfit?: number }>) => {
      state.isPending = true;
      const position = state.positions.find(p => p.id === action.payload.id);
      if (position) {
        if (action.payload.stopLoss !== undefined) {
          position.stopLoss = action.payload.stopLoss;
        }
        if (action.payload.takeProfit !== undefined) {
          position.takeProfit = action.payload.takeProfit;
        }
      }
      state.isPending = false;
    },
    closePosition: (state, action: PayloadAction<{id: string, closePrice: number}>) => {
      state.isPending = true;
      const position = state.positions.find(p => p.id === action.payload.id);
      if (position) {
        const profit = (action.payload.closePrice - position.purchasePrice) * position.quantity;
        state.realizedPL += profit;
        state.cashBalance += profit;
        state.positions = state.positions.filter(p => p.id !== action.payload.id);
        
        // Check if we should unsubscribe from symbol
        const hasOtherPositions = state.positions.some(p => p.symbol === position.symbol);
        if (!hasOtherPositions) {
          realTimeService.unsubscribe(position.symbol);
        }
        
        // Update portfolio P&L
        state.unrealizedPL = calculatePortfolioPL(state.positions);
        if (position.strategyId) {
          // Remove strategy P/L if this was the last position
          const hasOtherStrategyPositions = state.positions.some(p => p.strategyId === position.strategyId);
          if (!hasOtherStrategyPositions) {
            delete state.strategyProfitLoss[position.strategyId];
          }
        }
      }
      state.isPending = false;
    },
    updateMarginUsage: (state, action: PayloadAction<number>) => {
      state.marginUsage = action.payload;
    },
    setPending: (state, action: PayloadAction<boolean>) => {
      state.isPending = action.payload;
    },
    // Reset performance metrics
    resetMetrics: (state) => {
      state.updatesPerSecond = 0;
      state.lastSecondUpdates = 0;
      state.maxUpdatesPerSecond = 0;
      state.lastUpdateTime = Date.now();
    },
    setCashBalance: (state, action: PayloadAction<number>) => {
      state.cashBalance = action.payload;
    },
    // New actions for real-time P&L updates
    updatePositionPL: (state, action: PayloadAction<{ positionId: string; currentPrice: number; unrealizedPL: number }>) => {
      const { positionId, currentPrice, unrealizedPL } = action.payload;
      const position = state.positions.find(p => p.id === positionId);
      if (position) {
        const previousPL = position.unrealizedPL;
        position.currentPrice = currentPrice;
        position.unrealizedPL = unrealizedPL;
        position.lastUpdated = new Date().toISOString();
        
        // Update strategy P/L with actual change
        if (position.strategyId) {
          const plChange = unrealizedPL - previousPL;
          state.strategyProfitLoss[position.strategyId] =
            (state.strategyProfitLoss[position.strategyId] || 0) + plChange;
        }
      }
      
      // Recalculate total portfolio P&L
      state.unrealizedPL = calculatePortfolioPL(state.positions);
    },
    updatePortfolioPL: (state, action: PayloadAction<{ unrealizedPL: number; totalValue: number }>) => {
      const { unrealizedPL, totalValue } = action.payload;
      state.unrealizedPL = unrealizedPL;
      // You could add totalValue to state if needed
    }
  },
  extraReducers: (builder) => {
    builder.addCase(executeTradeThunk.fulfilled, (state, action: PayloadAction<OptionLeg[]>) => {
      const legs = action.payload;
      
      legs.forEach(leg => {
        const positionId = `${leg.symbol}-${leg.contractId}`;
        const existingPosition = state.positions.find(p => p.id === positionId);
        
        const premium = leg.premium || 0;
        const cost = leg.quantity * premium;
        const multiplier = leg.action === 'buy' ? -1 : 1;
        
        // Update cash balance (buy reduces cash, sell increases)
        state.cashBalance += cost * multiplier;
        
        if (existingPosition) {
          // Update existing position
          const newQuantity = existingPosition.quantity +
            (leg.action === 'buy' ? leg.quantity : -leg.quantity);
          
          if (newQuantity === 0) {
            // Remove position if quantity becomes zero
            state.positions = state.positions.filter(p => p.id !== positionId);
            
            // Check if we should unsubscribe from symbol
            const hasOtherPositions = state.positions.some(p => p.symbol === existingPosition.symbol);
            if (!hasOtherPositions) {
              realTimeService.unsubscribe(existingPosition.symbol);
            }
          } else {
            // Update average cost for position
            const totalCost = existingPosition.purchasePrice * existingPosition.quantity;
            existingPosition.purchasePrice =
              (totalCost + cost) / (existingPosition.quantity + leg.quantity);
            existingPosition.quantity = newQuantity;
            // Preserve positionType when updating existing position
            existingPosition.positionType = existingPosition.positionType;
            // Preserve positionType when updating existing position
            existingPosition.positionType = existingPosition.positionType;
          }
        } else if (leg.action === 'buy') {
          // Add new long position
          const newPosition = {
            id: positionId,
            symbol: leg.symbol,
            type: (leg.optionType || 'call') as "call" | "put",
            positionType: 'long' as 'long', // Explicitly type as union type
            quantity: leg.quantity,
            strike: leg.strike,
            expiry: leg.expiry,
            purchasePrice: premium,
            currentPrice: premium,
            unrealizedPL: 0
          };
          state.positions.push(newPosition);
          
          // Subscribe to real-time updates for this symbol
          realTimeService.subscribe(leg.symbol);
        } else {
          // Add new short position
          const newPosition = {
            id: positionId,
            symbol: leg.symbol,
            type: (leg.optionType || 'call') as "call" | "put",
            positionType: 'short' as 'short', // Explicitly type as union type
            quantity: -leg.quantity,
            strike: leg.strike,
            expiry: leg.expiry,
            purchasePrice: premium,
            currentPrice: premium,
            unrealizedPL: 0
          };
          state.positions.push(newPosition);
          
          // Subscribe to real-time updates for this symbol
          realTimeService.subscribe(leg.symbol);
        }
      });
      
      // Update portfolio P&L
      state.unrealizedPL = calculatePortfolioPL(state.positions);
      // Update strategy P/L for new positions
      legs.forEach(leg => {
        const positionId = `${leg.symbol}-${leg.contractId}`;
        const position = state.positions.find(p => p.id === positionId);
        if (position && position.strategyId) {
          state.strategyProfitLoss[position.strategyId] =
            (state.strategyProfitLoss[position.strategyId] || 0) + position.unrealizedPL;
        }
      });
    });
  }
});

// Setup real-time price listener with throttling
let isListenerSetup = false;
let batchUpdates: Array<{ symbol: string; price: number; timestamp: number }> = [];
let batchTimer: NodeJS.Timeout | null = null;
let lastBatchTime = 0;

export const setupPriceListener = (dispatch: any) => {
  if (!isListenerSetup) {
    realTimeService.priceUpdates$.subscribe(update => {
      // Add update to batch
      batchUpdates.push({
        symbol: update.symbol,
        price: update.price,
        timestamp: Date.now()
      });
      console.debug(`Received price update for ${update.symbol}: ${update.price}`);
      
      // Start batch timer if not already running
      if (!batchTimer) {
        console.debug(`Starting batch timer with ${batchUpdates.length} updates`);
        batchTimer = setTimeout(() => {
          const now = Date.now();
          const timeSinceLast = now - lastBatchTime;
          
          // Enforce strict 1-second minimum between updates
          if (timeSinceLast >= 1000) {
            console.debug(`Processing batch of ${batchUpdates.length} updates after ${timeSinceLast}ms`);
            dispatch(portfolioSlice.actions.batchUpdatePositionPrices(batchUpdates));
            lastBatchTime = now;
            batchUpdates = [];
          } else {
            // If not enough time has passed, reschedule
            const remaining = 1000 - timeSinceLast;
            console.debug(`Delaying batch by ${remaining}ms to enforce 1s throttle`);
            batchTimer = setTimeout(() => {
              console.debug(`Processing delayed batch of ${batchUpdates.length} updates`);
              dispatch(portfolioSlice.actions.batchUpdatePositionPrices(batchUpdates));
              lastBatchTime = Date.now();
              batchUpdates = [];
              batchTimer = null;
            }, remaining);
            return;
          }
          batchTimer = null;
        }, 1000);
      }
    });
    isListenerSetup = true;
    console.info('Price listener initialized');
  }
};

export const portfolioActions = portfolioSlice.actions;
export const { addPosition, updatePosition, updatePositionPrice, batchUpdatePositionPrices, modifyPosition, closePosition, updateMarginUsage, setPending, resetMetrics, setCashBalance, updatePositionPL, updatePortfolioPL } = portfolioSlice.actions;

// Helper to calculate profit/loss for a position including strategy context
export const calculatePositionProfitLoss = async (position: Position): Promise<number> => {
  // For now, use existing calculation - will be enhanced with strategy-specific logic
  return calculatePositionPL(position);
};
export default portfolioSlice.reducer;
