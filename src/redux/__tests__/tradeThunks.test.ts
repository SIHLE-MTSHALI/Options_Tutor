import { configureStore } from '@reduxjs/toolkit';
import portfolioReducer from '../portfolioSlice';
import * as TradeService from '../../services/TradeService';
import { executeTradeThunk } from '../tradeThunks';
import { Position } from '../portfolioSlice';
import { OptionLeg } from '../tradingSlice';

jest.mock('../../services/TradeService', () => ({
  TradeService: {
    executeTrade: jest.fn()
  }
}));

describe('tradeThunks', () => {
  let store: any;
  const mockPosition: Position = {
    id: 'test-pos',
    symbol: 'AAPL',
    type: 'stock',
    quantity: 100,
    purchasePrice: 150,
    currentPrice: 155,
    unrealizedPL: 0,
  };

  beforeEach(() => {
    store = configureStore({
      reducer: {
        portfolio: portfolioReducer
      },
      preloadedState: {
        portfolio: {
          cashBalance: 10000,
          positions: [mockPosition],
          unrealizedPL: 500,
          realizedPL: 0,
          marginUsage: 0,
          isPending: false,
        }
      }
    });
  });

  test('executeTradeThunk updates portfolio on success', async () => {
    (TradeService.TradeService.executeTrade as jest.Mock).mockResolvedValue({
      success: true,
      marginUsed: 0
    });

    const mockLegs: OptionLeg[] = [{
      id: 'leg1',
      contractId: 'contract1',
      symbol: 'AAPL',
      action: 'buy',
      quantity: 10,
      premium: 155,
      expiry: '2023-12-15',
      strike: 150,
      optionType: 'call',
      type: 'call'
    }];

    await store.dispatch(executeTradeThunk(mockLegs));

    const state = store.getState().portfolio;
    expect(state.positions).toHaveLength(2);
    expect(TradeService.TradeService.executeTrade).toHaveBeenCalled();
  });

  test('executeTradeThunk handles error', async () => {
    (TradeService.TradeService.executeTrade as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Insufficient funds'
    });

    const mockLegs: OptionLeg[] = [{
      id: 'leg2',
      contractId: 'contract2',
      symbol: 'AAPL',
      action: 'buy',
      quantity: 1000,
      premium: 155,
      expiry: '2023-12-15',
      strike: 150,
      optionType: 'call',
      type: 'call'
    }];

    await store.dispatch(executeTradeThunk(mockLegs));

    const state = store.getState().portfolio;
    expect(state.positions).toHaveLength(1);
  });
});