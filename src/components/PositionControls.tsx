import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Position } from '../redux/portfolioSlice';
import type { RootState } from '../redux/store';
import { closePosition } from '../redux/portfolioSlice';
import { stockTradeThunk } from '../redux/tradeThunks';
import { AlphaVantageService } from '../services/AlphaVantageService';
import type { AppDispatch } from '../redux/store';
import { PositionModifyDialog } from './PositionModifyDialog';

interface PositionControlsProps {
  position: Position;
}

const PositionControls: React.FC<PositionControlsProps> = ({ position }) => {
  const dispatch: AppDispatch = useDispatch();
  const alphaVantageService = AlphaVantageService.getInstance();
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const isPending = useSelector((state: RootState) => state.portfolio.isPending);
  // Calculate P&L
  const unrealizedPL = currentPrice
    ? (currentPrice - position.purchasePrice) * position.quantity
    : 0;

  // Fetch current price on mount
  useEffect(() => {
    let isMounted = true;
    
    const fetchPrice = async () => {
      try {
        setCurrentPrice(null); // Reset to loading state
        const price = await alphaVantageService.getStockQuote(position.symbol);
        if (isMounted) {
          // Handle case where service returns undefined/invalid instead of throwing
          if (typeof price === 'number' && !isNaN(price)) {
            setCurrentPrice(price);
          } else {
            console.error('Invalid price received:', price);
            setCurrentPrice(position.currentPrice); // Fallback to prop value
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to fetch current price:', error);
          setCurrentPrice(position.currentPrice); // Fallback to prop value
        }
      }
    };

    fetchPrice();

    return () => {
      isMounted = false;
    };
  }, [position.symbol, position.currentPrice]);


  const handleClosePosition = () => {
    if (isPending || currentPrice === null) {
      console.error('Cannot close position: price not available');
      return;
    }
    
    dispatch(stockTradeThunk({
      symbol: position.symbol,
      quantity: position.quantity,
      action: position.positionType === 'long' ? 'sell' : 'buy',
      type: 'market'
    })).then(() => {
      dispatch(closePosition({ id: position.id, closePrice: currentPrice }));
    }).catch((error: Error) => {
      console.error('Failed to close position:', error);
    });
  };

  const handleRefreshPrice = async () => {
    setIsRefreshing(true);
    try {
      const price = await alphaVantageService.getStockQuote(position.symbol);
      // Handle case where service returns undefined/invalid
      if (typeof price === 'number' && !isNaN(price)) {
        setCurrentPrice(price);
      } else {
        console.error('Invalid price received during refresh:', price);
        // Keep previous price value on refresh failure
      }
    } catch (error) {
      console.error('Failed to refresh price:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="position-controls" data-testid="position-controls">
      <div className="price-display">
        <span data-testid="current-price-label">
          {typeof currentPrice === 'number'
            ? `Current Price: $${currentPrice.toFixed(2)}`
            : 'Loading...'}
        </span>
        <button
          onClick={handleRefreshPrice}
          disabled={isRefreshing}
          data-testid="refresh-price-button"
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      
      <div className="pl-display">
        <span>Unrealized P/L:</span>
        <span
          className={unrealizedPL >= 0 ? 'positive' : 'negative'}
          data-testid="unrealized-pl-value"
        >
          {unrealizedPL >= 0 ? '+' : ''}{unrealizedPL.toFixed(2)}
        </span>
      </div>
      
      <div className="order-levels">
        <div className="level" onClick={() => setShowDialog(true)}>
          <span>Stop Loss:</span>
          <span>{position.stopLoss ? `$${position.stopLoss.toFixed(2)}` : 'Not set'}</span>
        </div>
        <div className="level" onClick={() => setShowDialog(true)}>
          <span>Take Profit:</span>
          <span>{position.takeProfit ? `$${position.takeProfit.toFixed(2)}` : 'Not set'}</span>
        </div>
      </div>
      
      <div className="action-buttons">
        <button
          onClick={() => setShowDialog(true)}
          className="modify-button"
        >
          Modify Position
        </button>
        <button
          onClick={handleClosePosition}
          disabled={isPending || currentPrice === null}
          className="close-button"
          data-testid="close-position-button"
        >
          {isPending ? 'Processing...' : currentPrice === null ? 'Price Loading...' : 'Close Position'}
        </button>
      </div>
      
      {showDialog && (
        <PositionModifyDialog
          position={position}
          onClose={() => setShowDialog(false)}
        />
      )}
    </div>
  );
};

export default PositionControls;