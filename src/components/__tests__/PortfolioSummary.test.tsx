import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import PortfolioSummary from '../PortfolioSummary';
import { configureStore } from '@reduxjs/toolkit';
import portfolioReducer from '../../redux/portfolioSlice';
import { Position } from '../../redux/portfolioSlice';

const mockPositions: Position[] = [
  {
    id: '1',
    symbol: 'AAPL',
    type: 'stock',
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
        portfolio: portfolioReducer,
      },
      preloadedState: {
        portfolio: {
          cashBalance: 10000,
          positions: mockPositions,
          unrealizedPL: 1500,
          realizedPL: 500,
          marginUsage: 0.25,
          isPending: false,
        },
      },
    });
  });

  test('renders portfolio summary with correct values', () => {
    render(
      <Provider store={store}>
        <PortfolioSummary />
      </Provider>
    );

    expect(screen.getByText('Portfolio Summary')).toBeInTheDocument();
    expect(screen.getByText('$10,000.00')).toBeInTheDocument(); // Cash balance
    expect(screen.getByText('$1,500.00')).toBeInTheDocument(); // Unrealized P&L
    expect(screen.getByText('$500.00')).toBeInTheDocument(); // Realized P&L
    expect(screen.getByText('25.00%')).toBeInTheDocument(); // Margin usage
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
    
    // Check position quantities
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    
    // Check P&L values
    expect(screen.getByText('$500.00')).toBeInTheDocument();
    expect(screen.getByText('$1,000.00')).toBeInTheDocument();
  });

  test('expands/collapses position details when clicked', () => {
    render(
      <Provider store={store}>
        <PortfolioSummary />
      </Provider>
    );

    // Initially not expanded
    expect(screen.queryByText('Stop Loss')).not.toBeInTheDocument();
    
    // Click to expand first position
    fireEvent.click(screen.getAllByRole('row')[1]);
    expect(screen.getByText('Stop Loss')).toBeInTheDocument();
    expect(screen.getByText('$140.00')).toBeInTheDocument();
    
    // Click to collapse
    fireEvent.click(screen.getAllByRole('row')[1]);
    expect(screen.queryByText('Stop Loss')).not.toBeInTheDocument();
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
        },
      },
    });

    render(
      <Provider store={store}>
        <PortfolioSummary />
      </Provider>
    );

    expect(screen.getByText('Updating portfolio...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('formats negative values correctly', () => {
    store = configureStore({
      reducer: {
        portfolio: portfolioReducer,
      },
      preloadedState: {
        portfolio: {
          cashBalance: -500,
          positions: [],
          unrealizedPL: -1000,
          realizedPL: -200,
          marginUsage: 0.75,
          isPending: false,
        },
      },
    });

    render(
      <Provider store={store}>
        <PortfolioSummary />
      </Provider>
    );

    expect(screen.getByText('-$500.00')).toBeInTheDocument();
    expect(screen.getByText('-$1,000.00')).toBeInTheDocument();
    expect(screen.getByText('-$200.00')).toBeInTheDocument();
    expect(screen.getByText('75.00%')).toBeInTheDocument();
  });
});