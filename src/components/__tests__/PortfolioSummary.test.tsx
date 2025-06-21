import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import PortfolioSummary from '../PortfolioSummary';
import { configureStore } from '@reduxjs/toolkit';
import portfolioReducer from '../../redux/portfolioSlice';
import { Position } from '../../redux/portfolioSlice';
import { initRealTimeService } from '../../services/realTimeService';

const mockPositions: Position[] = [
  {
    id: '1',
    symbol: 'AAPL',
    type: 'stock',
    positionType: 'long',
    quantity: 100,
    purchasePrice: 150,
    currentPrice: 155,
    stopLoss: 140,
    takeProfit: 170,
    unrealizedPL: 500
  },
  {
    id: '2',
    symbol: 'TSLA',
    type: 'stock',
    positionType: 'long',
    quantity: 50,
    purchasePrice: 200,
    currentPrice: 220,
    stopLoss: 180,
    takeProfit: 250,
    unrealizedPL: 1000
  }
];

describe('PortfolioSummary Component', () => {
  let store: any;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        portfolio: {
          ...portfolioReducer(undefined, { type: 'unknown' }),
        } as PortfolioState,
      },
      preloadedState: {
        portfolio: {
          cashBalance: 10000,
          positions: mockPositions,
          unrealizedPL: 1500,
          realizedPL: 500,
          marginUsage: 0.25,
          isPending: false,
          priceUpdateTimestamp: 0,
          updatesPerSecond: 0,
          lastSecondUpdates: 0,
          maxUpdatesPerSecond: 0,
          lastUpdateTime: Date.now(),
          connectionStatus: 'disconnected', // Add explicit connection state
        },
      },
    });
    // Mock realTimeService instead of initializing
    jest.spyOn(require('../../services/realTimeService'), 'initRealTimeService').mockImplementation(() => {});
  });

  test('renders portfolio summary with correct values', () => {
    render(
      <Provider store={store}>
        <PortfolioSummary />
      </Provider>
    );

    expect(screen.getByText('Portfolio Summary')).toBeInTheDocument();
    expect(screen.getByText('Cash Balance:')).toBeInTheDocument();
    expect(screen.getByText('$10000.00')).toBeInTheDocument();
    // Use getAllByText for labels that appear multiple times
    const unrealizedLabels = screen.getAllByText('Unrealized P/L:');
    expect(unrealizedLabels.length).toBeGreaterThan(0);
    expect(screen.getByText('+1500.00')).toBeInTheDocument();
    
    // Check Realized P/L value in summary section
    const realizedPLValue = within(screen.getAllByText('Realized P/L:')[0].closest('.metric')!).getByText('+500.00');
    expect(realizedPLValue).toBeInTheDocument();
    
    // Check Margin Usage value in summary section
    const marginUsageValue = within(screen.getAllByText('Margin Usage:')[0].closest('.metric')!).getByText('0.25%');
    expect(marginUsageValue).toBeInTheDocument();
  });

  test('renders positions table with correct data', () => {
    render(
      <Provider store={store}>
        <PortfolioSummary />
      </Provider>
    );

    // Check position symbols
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('TSLA')).toBeInTheDocument();
    
    // Check position types
    expect(screen.getAllByText('stock')).toHaveLength(2);
    
    // Check position quantities
    // Check position quantities with full text
    expect(screen.getByText('Qty: 100')).toBeInTheDocument();
    expect(screen.getByText('Qty: 50')).toBeInTheDocument();
    
    // Check position prices
    expect(screen.getByText('Current Price: $155.00')).toBeInTheDocument();
    expect(screen.getByText('Current Price: $220.00')).toBeInTheDocument();
  });

  test('displays position controls and connection status', async () => {
    render(
      <Provider store={store}>
        <PortfolioSummary />
      </Provider>
    );

    // Check connection status using existing test ID and text content
    const statusIndicator = screen.getByTestId('connection-status-indicator');
    
    await waitFor(() => {
      expect(statusIndicator).toHaveClass('disconnected');
      expect(statusIndicator).toHaveTextContent('● Disconnected');
    });
    
    // Check position controls
    expect(screen.getAllByText('Modify Position')).toHaveLength(2);
    expect(screen.getAllByText('Close Position')).toHaveLength(2);
  });

  test('displays loading state during pending operations', () => {
    store = configureStore({
      reducer: {
        portfolio: portfolioReducer,
      },
      preloadedState: {
        portfolio: {
          ...store.getState().portfolio,
          isPending: true,
          priceUpdateTimestamp: 0,
        },
      },
    });

    render(
      <Provider store={store}>
        <PortfolioSummary />
      </Provider>
    );

    // Check for processing buttons
    const processingButtons = screen.getAllByText('Processing...');
    expect(processingButtons.length).toBe(2);
    processingButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  test('formats negative values correctly', () => {
    store = configureStore({
      reducer: {
        portfolio: {
          ...portfolioReducer(undefined, { type: 'unknown' }),
          strategyProfitLoss: {}
        },
      },
      preloadedState: {
        portfolio: {
          cashBalance: -500,
          positions: [],
          unrealizedPL: -1000,
          realizedPL: -200,
          marginUsage: 0.75,
          isPending: false,
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
        <PortfolioSummary />
      </Provider>
    );

    expect(screen.getByText('$-500.00')).toBeInTheDocument();
    expect(screen.getByText('-1000.00')).toBeInTheDocument();
    expect(screen.getByText('-200.00')).toBeInTheDocument();
    expect(screen.getByText('0.75%')).toBeInTheDocument();
  });
});