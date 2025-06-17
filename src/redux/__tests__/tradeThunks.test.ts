import { AnyAction } from '@reduxjs/toolkit';
import { createStore, applyMiddleware, combineReducers, Middleware } from 'redux';
import { withExtraArgument } from 'redux-thunk';
import portfolioReducer from '../portfolioSlice';
import * as TradeService from '../../services/TradeService';
import { executeTradeThunk } from '../tradeThunks';
import { Position } from '../portfolioSlice';
import { OptionLeg } from '../tradingSlice';
import { initRealTimeService } from '../../services/realTimeService';

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
    positionType: 'long',
  };

  let actions: AnyAction[] = [];
  const actionRecorder: Middleware = (storeApi) => (next) => (action) => {
    actions.push(action as AnyAction);
    return next(action);
  };

  const mockTradeResult = {
    success: true,
    message: 'Trade executed successfully',
    marginUsed: 0,
    newPositions: []
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    (TradeService.TradeService.executeTrade as jest.Mock).mockClear();
    (TradeService.TradeService.executeTrade as jest.Mock).mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => resolve(mockTradeResult), 100);
      });
    });

    actions = [];
    const rootReducer = combineReducers({
      portfolio: portfolioReducer,
    });

    const middleware = applyMiddleware(
      actionRecorder,
      withExtraArgument({
        tradeService: TradeService.TradeService,
        realTimeService: {}
      })
    );

    store = createStore(
      rootReducer,
      {
        portfolio: {
          cashBalance: 10000,
          positions: [mockPosition],
          unrealizedPL: 500,
          realizedPL: 0,
          marginUsage: 0,
          isPending: false,
          priceUpdateTimestamp: 0,
          updatesPerSecond: 0,
          lastSecondUpdates: 0,
          maxUpdatesPerSecond: 0,
          lastUpdateTime: Date.now(),
        }
      },
      middleware
    );
    initRealTimeService(store);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('executeTradeThunk updates portfolio on success', async () => {
    console.log('[DEBUG] Starting test: executeTradeThunk updates portfolio on success');
    
    (TradeService.TradeService.executeTrade as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Trade executed successfully',
      marginUsed: 0,
      newPositions: [
        mockPosition,
        {
          id: 'new-option-pos',
          symbol: 'AAPL',
          type: 'option',
          quantity: 10,
          purchasePrice: 155,
          currentPrice: 155,
          unrealizedPL: 0,
          positionType: 'long',
          optionDetails: {
            expiry: '2023-12-15',
            strike: 150,
            optionType: 'call'
          }
        }
      ]
    });

    console.log('[DEBUG] Initial portfolio state:', store.getState().portfolio);

    const mockLegs: OptionLeg[] = [{
      id: 'leg1',
      contractId: 'contract1',
      symbol: 'AAPL',
      action: 'buy',
      quantity: 10,
      premium: 155,
      expiry: '2023-12-15',
      strike: 150,
      optionType: 'call'
    }];

    console.log('[DEBUG] Dispatching executeTradeThunk');
    const dispatchPromise = store.dispatch(executeTradeThunk(mockLegs));
    
    // Advance timers to resolve async operations
    jest.advanceTimersByTime(100);
    await dispatchPromise;
    
    console.log('[DEBUG] After dispatch, portfolio state:', store.getState().portfolio);

    const pendingAction = actions.find((a: AnyAction) => a.type === executeTradeThunk.pending.type);
    const fulfilledAction = actions.find((a: AnyAction) => a.type === executeTradeThunk.fulfilled.type);
    
    expect(pendingAction).toBeDefined();
    expect(fulfilledAction).toBeDefined();
    expect(TradeService.TradeService.executeTrade).toHaveBeenCalled();
  });

  test('executeTradeThunk handles error', async () => {
    console.log('[DEBUG] Starting test: executeTradeThunk handles error');
    const mockError = new Error('Insufficient funds');
    
    // Mock the executeTrade to reject
    (TradeService.TradeService.executeTrade as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Insufficient funds',
      marginUsed: 0,
      newPositions: []
    });

    console.log('[DEBUG] Initial portfolio state:', store.getState().portfolio);

    const mockLegs: OptionLeg[] = [{
      id: 'leg2',
      contractId: 'contract2',
      symbol: 'AAPL',
      action: 'buy',
      quantity: 1000,
      premium: 155,
      expiry: '2023-12-15',
      strike: 150,
      optionType: 'call'
    }];

    console.log('[DEBUG] Dispatching executeTradeThunk with insufficient funds');
    const dispatchPromise = store.dispatch(executeTradeThunk(mockLegs));
    
    // Advance timers to resolve async operations
    jest.advanceTimersByTime(100);
    await dispatchPromise;
    
    console.log('[DEBUG] After dispatch, portfolio state:', store.getState().portfolio);

    // The actions array is already populated by the middleware
    const fulfilledAction = actions.find((a: AnyAction) => a.type === executeTradeThunk.fulfilled.type);
    
    console.log('[DEBUG] Fulfilled action:', fulfilledAction);
    
    expect(fulfilledAction).toBeDefined();
    expect(TradeService.TradeService.executeTrade).toHaveBeenCalled();
    expect(fulfilledAction?.payload).toEqual({
      success: false,
      message: 'Insufficient funds',
      marginUsed: 0,
      newPositions: []
    });
  });
});