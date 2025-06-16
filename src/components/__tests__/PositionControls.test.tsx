import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import PositionControls from '../PositionControls';
import { configureStore } from '@reduxjs/toolkit';
import portfolioReducer from '../../redux/portfolioSlice';
import * as AlphaVantageService from '../../services/AlphaVantageService';
import * as TradeService from '../../services/TradeService';
import { Position } from '../../redux/portfolioSlice';
import { portfolioActions } from '../../redux/portfolioSlice';
import { initRealTimeService } from '../../services/realTimeService';
import { tradeMiddleware } from '../../services/tradeMiddleware';

jest.mock('../../services/AlphaVantageService', () => ({
  AlphaVantageService: {
    getInstance: jest.fn(() => ({
      getStockQuote: jest.fn(),
    })),
  },
}));

jest.mock('../../services/TradeService', () => ({
  TradeService: {
    executeTrade: jest.fn().mockResolvedValue({
      success: true,
      marginUsed: 0,
      newPositions: []
    })
  }
}));

jest.mock('../../services/tradeMiddleware', () => ({
  tradeMiddleware: jest.fn().mockImplementation(() => (next: any) => (action: any) => next(action))
}));

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

describe('PositionControls Component', () => {
  let store: any;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        portfolio: portfolioReducer,
      },
      preloadedState: {
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
        },
      },
    });

    (AlphaVantageService.AlphaVantageService.getInstance().getStockQuote as jest.Mock)
      .mockResolvedValue(155);
    initRealTimeService(store);
  });

  test('renders position data correctly', async () => {
    render(
      <Provider store={store}>
        <PositionControls position={mockPosition} />
      </Provider>
    );

    // Use findBy queries to wait for async content
    expect(await screen.findByText(/Current Price:/)).toBeInTheDocument();
    expect(await screen.findByText(/\$155\.00/)).toBeInTheDocument();
    expect(await screen.findByText(/Unrealized P\/L:/)).toBeInTheDocument();
    expect(await screen.findByText(/\+500\.00/)).toBeInTheDocument();
  });

  test('refreshes price on button click', async () => {
    (AlphaVantageService.AlphaVantageService.getInstance().getStockQuote as jest.Mock)
      .mockResolvedValueOnce(160);

    render(
      <Provider store={store}>
        <PositionControls position={mockPosition} />
      </Provider>
    );

    fireEvent.click(await screen.findByText('Refresh'));
    
    // Wait for price update
    await waitFor(async () => {
      expect(await screen.findByText(/\$160\.00/)).toBeInTheDocument();
    });
    
    // Verify P/L update
    expect(await screen.findByText(/\+1000\.00/)).toBeInTheDocument();
});

  test('disables buttons during pending state', async () => {
    const pendingStore = configureStore({
      reducer: {
        portfolio: portfolioReducer,
      },
      preloadedState: {
        portfolio: {
          ...store.getState().portfolio,
          isPending: true
        },
      },
    });

    render(
      <Provider store={pendingStore}>
        <PositionControls position={mockPosition} />
      </Provider>
    );

    // Verify button states
    expect(await screen.findByText('Processing...')).toBeDisabled();
    // The 'Close Position' button is replaced by 'Processing...'
  });

  test('opens modify dialog on button click', async () => {
    render(
      <Provider store={store}>
        <PositionControls position={mockPosition} />
      </Provider>
    );

    fireEvent.click(screen.getByText('Modify Position'));
    expect(screen.getByText('Modify Position: AAPL')).toBeInTheDocument();
  });

  test('successfully closes position on button click', async () => {
    const mockExecuteTrade = (TradeService.TradeService.executeTrade as jest.Mock).mockResolvedValue({
      success: true,
      marginUsed: 0,
      newPositions: []
    });
    
    render(
      <Provider store={store}>
        <PositionControls position={mockPosition} />
      </Provider>
    );

    await act(async () => {
      await act(async () => {
        fireEvent.click(screen.getByText('Close Position'));
      });
    });
    
    await waitFor(() => {
      expect(mockExecuteTrade).toHaveBeenCalled();
    });
    
    // Verify store updates
    expect(store.getState().portfolio.positions).toHaveLength(0);
    expect(store.getState().portfolio.cashBalance).toBe(10000 + (100 * 155));
    expect(store.getState().portfolio.realizedPL).toBe(500);
  });

  test('handles error when closing position', async () => {
    const mockExecuteTrade = (TradeService.TradeService.executeTrade as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Insufficient funds',
      marginUsed: 0,
      newPositions: []
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    render(
      <Provider store={store}>
        <PositionControls position={mockPosition} />
      </Provider>
    );

    // Update state to trigger trade execution
    store.dispatch(portfolioActions.setCashBalance(20000));
    
    fireEvent.click(screen.getByText('Close Position'));
    
    await waitFor(() => {
      expect(mockExecuteTrade).toHaveBeenCalledWith({
        symbol: 'AAPL',
        quantity: 100,
        action: 'sell',
        type: 'market'
      });
      expect(store.getState().portfolio.positions).toContainEqual(mockPosition);
      expect(errorSpy).toHaveBeenCalledWith('Failed to close position:', 'Insufficient funds');
    });
    
    errorSpy.mockRestore();
  });

  test('handles error during price refresh', async () => {
    const errorMessage = 'Failed to fetch price';
    (AlphaVantageService.AlphaVantageService.getInstance().getStockQuote as jest.Mock)
      .mockRejectedValue(new Error(errorMessage));

    render(
      <Provider store={store}>
        <PositionControls position={mockPosition} />
      </Provider>
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Refresh'));
    });
    
    // Verify error is handled and price remains unchanged
    await waitFor(() => {
      expect(screen.getByText('Current Price:')).toBeInTheDocument();
      expect(screen.getByText('$155.00')).toBeInTheDocument();
    });
  });
});