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
  let mockGetStockQuote: jest.Mock;

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

    mockGetStockQuote = AlphaVantageService.AlphaVantageService.getInstance().getStockQuote as jest.Mock;
    mockGetStockQuote.mockResolvedValue(155);
    initRealTimeService(store);
  });

  test('renders position data correctly', async () => {
    await act(async () => {
      render(
        <Provider store={store}>
          <PositionControls position={mockPosition} />
        </Provider>
      );
    });
    
    // Wait for initial price load
    const priceLabel = await screen.findByTestId('current-price-label');
    expect(priceLabel).toHaveTextContent('Current Price: $155.00');
    
    // Test invalid price handling
    mockGetStockQuote.mockResolvedValueOnce(NaN);
    const { rerender: firstRerender } = render(
      <Provider store={store}>
        <PositionControls position={mockPosition} />
      </Provider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('current-price-label')).toHaveTextContent('Loading...');
    });
    
    expect(await screen.findByTestId('refresh-price-button')).toBeInTheDocument();
    
    const plValue = await screen.findByTestId('unrealized-pl-value');
    expect(plValue).toHaveTextContent('+500.00');
  });

  test('refreshes price on button click', async () => {
    (AlphaVantageService.AlphaVantageService.getInstance().getStockQuote as jest.Mock)
      .mockResolvedValueOnce(160);

    await act(async () => {
      render(
        <Provider store={store}>
          <PositionControls position={mockPosition} />
        </Provider>
      );
    });

    await act(async () => {
      fireEvent.click(await screen.findByTestId('refresh-price-button'));
    });
    
    // Wait for price update
    await waitFor(async () => {
      const priceLabel = await screen.findByTestId('current-price-label');
      expect(priceLabel).toHaveTextContent('Current Price: $160.00');
    });
    
    // Test invalid price during refresh
    mockGetStockQuote.mockResolvedValueOnce(undefined);
    fireEvent.click(screen.getByTestId('refresh-price-button'));
    await waitFor(() => {
      expect(screen.getByTestId('refresh-price-button')).not.toBeDisabled();
      expect(console.error).toHaveBeenCalledWith('Invalid price received during refresh:', undefined);
      expect(screen.getByTestId('current-price-label')).toHaveTextContent('Current Price: $160.00');
    });
  });

  test('disables close button when price is loading', async () => {
    const positionWithoutPrice: Position = {
      ...mockPosition,
      currentPrice: 0
    };
    
    // Render without mocking useState
    render(
      <Provider store={store}>
        <PositionControls position={positionWithoutPrice} />
      </Provider>
    );
    
    const closeButton = await screen.findByTestId('close-position-button');
    expect(closeButton).toBeDisabled();
    expect(closeButton).toHaveTextContent('Price Loading...');
  });

  test('disables buttons during pending state', async () => {
    // Update the existing store to pending state
    store.dispatch(portfolioActions.setPending(true));
    
    render(
      <Provider store={store}>
        <PositionControls position={mockPosition} />
      </Provider>
    );

    const closeButton = await screen.findByTestId('close-position-button');
    expect(closeButton).toBeDisabled();
    expect(closeButton).toHaveTextContent('Processing...');
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
    
    await act(async () => {
      render(
        <Provider store={store}>
          <PositionControls position={mockPosition} />
        </Provider>
      );
    });

    await act(async () => {
      fireEvent.click(await screen.findByTestId('close-position-button'));
    });
    
    await waitFor(() => {
      expect(mockExecuteTrade).toHaveBeenCalled();
    });
    
    // Verify store updates
    const state = store.getState().portfolio;
    expect(state.positions).toHaveLength(0);
    expect(state.cashBalance).toBe(10000 + (100 * 155));
    expect(state.realizedPL).toBe(500);
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
    
    fireEvent.click(await screen.findByTestId('close-position-button'));
    
    await waitFor(() => {
      expect(mockExecuteTrade).toHaveBeenCalledWith({
        symbol: 'AAPL',
        quantity: 100,
        action: 'sell',
        type: 'market'
      });
      expect(errorSpy).toHaveBeenCalledWith('Failed to close position:', 'Insufficient funds');
    });
    
    errorSpy.mockRestore();
  });

  test('handles error during price refresh', async () => {
    const errorMessage = 'Failed to fetch price';
    mockGetStockQuote.mockRejectedValueOnce(new Error(errorMessage));

    render(
      <Provider store={store}>
        <PositionControls position={mockPosition} />
      </Provider>
    );

    await waitFor(() => screen.getByTestId('refresh-price-button'));
    fireEvent.click(screen.getByTestId('refresh-price-button'));
    
    // Verify error is handled and price remains unchanged
    await waitFor(() => {
      expect(screen.getByTestId('current-price-label')).toHaveTextContent('Current Price: $155.00');
    });
  });
});