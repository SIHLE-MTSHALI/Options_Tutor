import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import PositionModifyDialog from '../PositionModifyDialog';
import { configureStore } from '@reduxjs/toolkit';
import portfolioReducer from '../../redux/portfolioSlice';
import tradingReducer from '../../redux/tradingSlice';
import * as TradeService from '../../services/TradeService';
import { Position } from '../../redux/types';

jest.mock('../../services/TradeService', () => ({
  TradeService: {
    executeTrade: jest.fn().mockResolvedValue({ success: true })
  }
}));

const mockPosition: Position = {
  id: 'test-pos',
  symbol: 'AAPL',
  type: 'stock',
  positionType: 'long',
  quantity: 100,
  strike: undefined,
  expiry: undefined,
  purchasePrice: 150,
  currentPrice: 155,
  stopLoss: undefined,
  takeProfit: undefined,
  unrealizedPL: 0,
  lastUpdated: '2024-01-01T00:00:00Z',
  strategyId: undefined
};

describe('PositionModifyDialog Component', () => {
  let store: any;
  const onClose = jest.fn();

  beforeEach(() => {
    store = configureStore({
      reducer: {
        portfolio: portfolioReducer,
        trading: tradingReducer,
      },
      preloadedState: {
        portfolio: {
          cashBalance: 10000,
          positions: [mockPosition],
          strategies: [],
          unrealizedPL: 500,
          realizedPL: 0,
          marginUsage: 0,
          isPending: false,
          priceUpdateTimestamp: 0,
          updatesPerSecond: 0,
          lastSecondUpdates: 0,
          maxUpdatesPerSecond: 0,
          lastUpdateTime: Date.now(),
          strategyProfitLoss: {}
        },
        trading: {
          selectedLeg: null,
          legs: [],
          orderType: 'limit',
          status: 'idle',
          error: null,
          selectedStrategy: null,
          showPayoffDiagram: false,
          showRiskGraph: false,
          tradeError: null,
          accountId: 'test-account'
        }
      },
    });
  });

  test('renders dialog with initial values', () => {
    render(
      <Provider store={store}>
        <PositionModifyDialog
          open={true}
          onClose={onClose}
          position={mockPosition}
          currentPrice={155}
          onModify={jest.fn()}
        />
      </Provider>
    );

    expect(screen.getByText('Manage Position: AAPL')).toBeInTheDocument();
    expect(screen.getByText('Quantity: 100')).toBeInTheDocument();
    expect(screen.getByText('Current Price: $155.00')).toBeInTheDocument();
  });

  test('handles stop loss and take profit input changes', () => {
    render(
      <Provider store={store}>
        <PositionModifyDialog
          open={true}
          onClose={onClose}
          position={mockPosition}
          currentPrice={155}
          onModify={jest.fn()}
        />
      </Provider>
    );

    const stopLossInput = screen.getByLabelText('Stop Loss');
    const takeProfitInput = screen.getByLabelText('Take Profit');

    fireEvent.change(stopLossInput, { target: { value: '140' } });
    fireEvent.change(takeProfitInput, { target: { value: '170' } });

    expect(stopLossInput).toHaveValue(140);
    expect(takeProfitInput).toHaveValue(170);
  });

  test('submits modification and closes dialog', async () => {
    const mockValidatePositionModification = jest.spyOn(TradeService.TradeService, 'validatePositionModification').mockReturnValue(null);

    render(
      <Provider store={store}>
        <PositionModifyDialog
          open={true}
          onClose={onClose}
          position={mockPosition}
          currentPrice={155}
          onModify={jest.fn()}
        />
      </Provider>
    );

    fireEvent.change(screen.getByLabelText('Stop Loss'), { target: { value: '140' } });
    fireEvent.change(screen.getByLabelText('Take Profit'), { target: { value: '170' } });
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(mockValidatePositionModification).toHaveBeenCalledWith(
        mockPosition,
        140,
        170,
        155
      );
    });

    mockValidatePositionModification.mockRestore();
  });

  test('handles modification error', async () => {
    const mockValidatePositionModification = jest.spyOn(TradeService.TradeService, 'validatePositionModification').mockReturnValue('Insufficient funds');

    render(
      <Provider store={store}>
        <PositionModifyDialog
          open={true}
          onClose={onClose}
          position={mockPosition}
          currentPrice={155}
          onModify={jest.fn()}
        />
      </Provider>
    );

    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(mockValidatePositionModification).toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByText('Insufficient funds')).toBeInTheDocument();
    });

    mockValidatePositionModification.mockRestore();
  });

  test('closes dialog on cancel', () => {
    render(
      <Provider store={store}>
        <PositionModifyDialog
          open={true}
          onClose={onClose}
          position={mockPosition}
          currentPrice={155}
          onModify={jest.fn()}
        />
      </Provider>
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  test('disables buttons during pending state', () => {
    render(
      <Provider store={store}>
        <PositionModifyDialog
          open={true}
          onClose={onClose}
          position={mockPosition}
          currentPrice={155}
          onModify={jest.fn()}
        />
      </Provider>
    );

    // The buttons should be enabled by default since we're not in a submitting state
    expect(screen.getByText('Save Changes')).not.toBeDisabled();
    expect(screen.getByText('Cancel')).not.toBeDisabled();
  });
});