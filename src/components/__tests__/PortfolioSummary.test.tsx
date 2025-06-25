import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import PortfolioSummary from '../PortfolioSummary';
import { configureStore } from '@reduxjs/toolkit';
import portfolioReducer, { PortfolioState } from '../../redux/portfolioSlice';

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
          strategyProfitLoss: {}
        } as PortfolioState,
      },
    });
  });

  test('renders portfolio summary', () => {
    render(
      <Provider store={store}>
        <PortfolioSummary />
      </Provider>
    );
    
    expect(screen.getByText(/portfolio/i)).toBeInTheDocument();
  });
});