import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '@redux/store';
import { OptionLeg } from '@redux/tradingSlice';
import { addPosition } from '@redux/portfolioSlice';
import { AnyAction } from 'redux';

interface TradeAction extends AnyAction {
  type: 'trading/executeTrade';
  payload: OptionLeg[];
}

export const tradeMiddleware: Middleware<{}, RootState> = store => next => (action: TradeAction) => {
  if (action.type !== 'trading/executeTrade') {
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
  const margin = legs.reduce((total, leg) => {
    return total + calculateMargin(leg, state);
  }, 0);
  
  // Check available balance
  if (margin > state.portfolio.cashBalance) {
    console.error('Insufficient funds for trade');
    return;
  }

  // Process each leg
  try {
    legs.forEach(leg => {
      store.dispatch(addPosition({
        id: `${leg.id}-${Date.now()}`,
        symbol: 'TSLA', // TODO: Get from leg
        type: leg.type,
        quantity: leg.action === 'buy' ? leg.quantity : -leg.quantity,
        strike: leg.strike,
        expiry: leg.expiry,
        purchasePrice: leg.premium,
        currentPrice: leg.premium
      }));
    });

    return next(action);
  } catch (error) {
    console.error('Trade execution failed:', error);
    throw error;
  }
};

function validateLeg(leg: OptionLeg, state: RootState): boolean {
  if (leg.quantity <= 0) return false;
  if (leg.premium <= 0) return false;
  if (!state.marketData.optionChains['TSLA']) return false; // TODO: Dynamic symbol
  return true;
}

function calculateMargin(leg: OptionLeg, state: RootState): number {
  if (leg.action === 'buy') {
    return leg.premium * leg.quantity;
  }
  return leg.premium * leg.quantity * 5; // Rough margin for short options
}