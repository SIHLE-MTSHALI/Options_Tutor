import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { PositionModifyDialog } from '../PositionModifyDialog';
import { configureStore } from '@reduxjs/toolkit';
import portfolioReducer from '../../redux/portfolioSlice';
import * as TradeService from '../../services/TradeService';
import { Position } from '../../redux/portfolioSlice';

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

describe('PositionModifyDialog Component', () => {
  let store: any;
  const onClose = jest.fn();

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
        },
      },
    });
  });

  test('renders dialog with initial values', () => {
    render(
      <Provider store={store}>
        <PositionModifyDialog
          onClose={onClose}
          position={mockPosition}
        />
      </Provider>
    );

    expect(screen.getByText('Modify Position: AAPL')).toBeInTheDocument();
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
    expect(screen.getByDisplayValue('155')).toBeInTheDocument();
  });

  test('handles quantity and price input changes', () => {
    render(
      <Provider store={store}>
        <PositionModifyDialog
          onClose={onClose}
          position={mockPosition}
        />
      </Provider>
    );

    const quantityInput = screen.getByLabelText('Quantity:');
    const priceInput = screen.getByLabelText('Price:');

    fireEvent.change(quantityInput, { target: { value: '50' } });
    fireEvent.change(priceInput, { target: { value: '160' } });

    expect(quantityInput).toHaveValue(50);
    expect(priceInput).toHaveValue(160);
  });

  test('submits modification and closes dialog', async () => {
    const mockExecuteTrade = (TradeService.TradeService.executeTrade as jest.Mock).mockResolvedValue({ success: true });

    render(
      <Provider store={store}>
        <PositionModifyDialog
          onClose={onClose}
          position={mockPosition}
        />
      </Provider>
    );

    fireEvent.change(screen.getByLabelText('Quantity:'), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText('Price:'), { target: { value: '160' } });
    fireEvent.click(screen.getByText('Modify'));

    await waitFor(() => {
      expect(mockExecuteTrade).toHaveBeenCalledWith({
        type: 'modify',
        symbol: 'AAPL',
        quantity: 50,
        price: 160,
        positionId: 'test-pos'
      });
      expect(onClose).toHaveBeenCalled();
    });
  });

  test('handles modification error', async () => {
    const mockExecuteTrade = (TradeService.TradeService.executeTrade as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Insufficient funds'
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    render(
      <Provider store={store}>
        <PositionModifyDialog
          onClose={onClose}
          position={mockPosition}
        />
      </Provider>
    );

    fireEvent.click(screen.getByText('Modify'));

    await waitFor(() => {
      expect(mockExecuteTrade).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith('Failed to modify position:', 'Insufficient funds');
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByText('Error: Insufficient funds')).toBeInTheDocument();
    });

    errorSpy.mockRestore();
  });

  test('closes dialog on cancel', () => {
    render(
      <Provider store={store}>
        <PositionModifyDialog
          onClose={onClose}
          position={mockPosition}
        />
      </Provider>
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
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
        },
      },
    });

    render(
      <Provider store={store}>
        <PositionModifyDialog
          onClose={onClose}
          position={mockPosition}
        />
      </Provider>
    );

    expect(screen.getByText('Modify')).toBeDisabled();
    expect(screen.getByText('Cancel')).toBeDisabled();
  });
});