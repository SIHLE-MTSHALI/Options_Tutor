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

jest.mock('../../services/AlphaVantageService', () => ({
  AlphaVantageService: {
    getInstance: jest.fn(() => ({
      getStockQuote: jest.fn(),
    })),
  },
}));

jest.mock('../../services/TradeService', () => ({
  TradeService: {
    executeTrade: jest.fn().mockResolvedValue({ success: true })
  }
}));

const mockPosition: Position = {
  id: 'test-pos',
  symbol: 'AAPL',
  type: 'stock',
  quantity: 100,
  purchasePrice: 150,
  currentPrice: 155,
  unrealizedPL: 0,
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
  });

  test('renders position data correctly', () => {
    render(
      <Provider store={store}>
        <PositionControls position={mockPosition} />
      </Provider>
    );

    expect(screen.getByText('Current Price: $155.00')).toBeInTheDocument();
    expect(screen.getByText('Unrealized P/L: +500.00')).toBeInTheDocument();
  });

  test('refreshes price on button click', async () => {
    (AlphaVantageService.AlphaVantageService.getInstance().getStockQuote as jest.Mock)
      .mockResolvedValueOnce(160);

    render(
      <Provider store={store}>
        <PositionControls position={mockPosition} />
      </Provider>
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Refresh'));
    });
    await waitFor(() => {
      expect(screen.getByText('Current Price: $160.00')).toBeInTheDocument();
      expect(screen.getByText('Unrealized P/L: +1000.00')).toBeInTheDocument();
    });
  });

  test('disables buttons during pending state', () => {
    store = configureStore({
      reducer: {
        portfolio: portfolioReducer,
      },
      preloadedState: {
        portfolio: {
          ...store.getState().portfolio,
          isPending: true,
          priceUpdateTimestamp: 0,
          updatesPerSecond: 0,
          lastSecondUpdates: 0,
          maxUpdatesPerSecond: 0,
          lastUpdateTime: Date.now(),
        },
      },
    });

    render(
      <Provider store={store}>
        <PositionControls position={mockPosition} />
      </Provider>
    );

    expect(screen.getByText('Processing...')).toBeDisabled();
    expect(screen.getByText('Close Position')).toBeDisabled();
  });

  test('opens modify dialog on button click', () => {
    render(
      <Provider store={store}>
        <PositionControls position={mockPosition} />
      </Provider>
    );

    fireEvent.click(screen.getByText('Modify Position'));
    expect(screen.getByText('Position Modification')).toBeInTheDocument();
  });

  test('successfully closes position on button click', async () => {
    const mockExecuteTrade = (TradeService.TradeService.executeTrade as jest.Mock).mockResolvedValue({ success: true });
    
    render(
      <Provider store={store}>
        <PositionControls position={mockPosition} />
      </Provider>
    );

    fireEvent.click(screen.getByText('Close Position'));
    
    await waitFor(() => {
      expect(mockExecuteTrade).toHaveBeenCalledWith({
        type: 'close',
        symbol: 'AAPL',
        quantity: 100,
        price: 155,
        positionId: 'test-pos'
      });
      expect(store.getState().portfolio.positions).toHaveLength(0);
      expect(store.getState().portfolio.cashBalance).toBe(25500);
    });
  });

  test('handles error when closing position', async () => {
    const mockExecuteTrade = (TradeService.TradeService.executeTrade as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Insufficient funds'
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    render(
      <Provider store={store}>
        <PositionControls position={mockPosition} />
      </Provider>
    );

    fireEvent.click(screen.getByText('Close Position'));
    
    await waitFor(() => {
      expect(mockExecuteTrade).toHaveBeenCalled();
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
    
    // Verify error is handled gracefully
    await waitFor(() => {
      expect(screen.getByText('Current Price: $155.00')).toBeInTheDocument();
      expect(screen.getByText('Error refreshing price')).toBeInTheDocument();
    });
  });
});