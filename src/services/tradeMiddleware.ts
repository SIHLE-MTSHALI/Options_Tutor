import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '@redux/store';
import { AssetType, OptionLeg } from '@redux/types';
import { addPosition } from '@redux/portfolioSlice';
import { AnyAction } from 'redux';

interface TradeAction extends AnyAction {
  type: 'trading/executeTrade';
  payload: OptionLeg[];
}

// Type guard for TradeAction
function isTradeAction(action: unknown): action is TradeAction {
  return (action as TradeAction)?.type === 'trading/executeTrade';
}

export const tradeMiddleware: Middleware<{}, RootState> = store => next => (action: unknown) => {
  if (!isTradeAction(action)) {
    return next(action);
  }

  const legs = action.payload;
  const state = store.getState();
  
  // Validate each leg
  for (const leg of legs) {
    if (!validateLeg(leg, state)) {
      console.error('Invalid trade leg:', leg);
      return;
    }
  }

  // Calculate total margin requirement
  const margin = legs.reduce((total: number, leg: OptionLeg) => {
    return total + calculateMargin(leg, state);
  }, 0);
  
  // Check available balance
  if (margin > state.portfolio.cashBalance) {
    console.error('Insufficient funds for trade');
    return;
  }

  // Process each leg
  try {
    legs.forEach((leg: OptionLeg) => {
      store.dispatch(addPosition({
        id: `${leg.id}-${Date.now()}`,
        symbol: leg.symbol,
        type: leg.optionType as AssetType, // Cast to AssetType since we know it's either call or put
        positionType: leg.action === 'buy' ? 'long' : 'short',
        quantity: leg.quantity,
        strike: leg.strike,
        expiry: leg.expiry,
        purchasePrice: leg.premium || 0,
        currentPrice: leg.premium || 0,
        unrealizedPL: 0
      }));
    });

    return next(action);
  } catch (error) {
    console.error('Trade execution failed:', error);
    throw error;
  }
};

function validateLeg(leg: OptionLeg, state: RootState): boolean {
  if (!leg.id) return false;
  if (leg.quantity <= 0) return false;
  if (!leg.premium || leg.premium <= 0) return false;
  if (!leg.optionType) return false;
  if (!state.marketData.optionChains['TSLA']) return false; // TODO: Dynamic symbol
  return true;
}

function calculateMargin(leg: OptionLeg, state: RootState): number {
  if (leg.action === 'buy') {
    return (leg.premium || 0) * leg.quantity;
  }
  return (leg.premium || 0) * leg.quantity * 5; // Rough margin for short options
}