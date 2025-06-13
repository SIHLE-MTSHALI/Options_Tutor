import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Position } from '../redux/portfolioSlice';
import { closePosition } from '../redux/portfolioSlice';
import { AlphaVantageService } from '../services/AlphaVantageService';
import { PositionModifyDialog } from './PositionModifyDialog';

interface PositionControlsProps {
  position: Position;
}

const PositionControls: React.FC<PositionControlsProps> = ({ position }) => {
  const dispatch = useDispatch();
  const alphaVantageService = AlphaVantageService.getInstance();
  const [currentPrice, setCurrentPrice] = useState(position.currentPrice);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  // Calculate P&L
  const unrealizedPL = (currentPrice - position.purchasePrice) * position.quantity;

  // Fetch current price on mount
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const price = await alphaVantageService.getStockQuote(position.symbol);
        setCurrentPrice(price);
      } catch (error) {
        console.error('Failed to fetch current price:', error);
      }
    };
    
    fetchPrice();
  }, [position.symbol]);


  const handleClosePosition = () => {
    setIsClosing(true);
    try {
      // Use current price for closing
      dispatch(closePosition({ id: position.id, closePrice: currentPrice }));
    } catch (error) {
      console.error('Failed to close position:', error);
    } finally {
      setIsClosing(false);
    }
  };

  const handleRefreshPrice = async () => {
    setIsRefreshing(true);
    try {
      const price = await alphaVantageService.getStockQuote(position.symbol);
      setCurrentPrice(price);
    } catch (error) {
      console.error('Failed to refresh price:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="position-controls">
      <div className="price-display">
        <span>Current Price: ${currentPrice.toFixed(2)}</span>
        <button onClick={handleRefreshPrice} disabled={isRefreshing}>
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      
      <div className="pl-display">
        <span>Unrealized P/L:</span>
        <span className={unrealizedPL >= 0 ? 'positive' : 'negative'}>
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
          disabled={isClosing}
          className="close-button"
        >
          {isClosing ? 'Closing...' : 'Close Position'}
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