import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, CircularProgress } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { closePosition, modifyPosition, rollPosition } from '../redux/tradeThunks';
import { Position, OptionLeg } from '../redux/types';
import { MarginService } from '../services/MarginService';
import { TradeService } from '../services/TradeService';

interface PositionModifyDialogProps {
  open: boolean;
  onClose: () => void;
  position: Position;
  currentPrice: number | null;
  onModify: (modifiedPosition: Position) => void;
}

const PositionModifyDialog: React.FC<PositionModifyDialogProps> = ({
  open,
  onClose,
  position,
  currentPrice,
  onModify
}) => {
  const dispatch = useAppDispatch();
  const accountId = useAppSelector(state => state.trading.accountId);
  const [stopLoss, setStopLoss] = useState<number | ''>(position.stopLoss || '');
  const [takeProfit, setTakeProfit] = useState<number | ''>(position.takeProfit || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maxLoss, setMaxLoss] = useState<number>(0);
  const [marginUtilization, setMarginUtilization] = useState<number>(0);
  
  // Calculate current P/L
  const currentPL = currentPrice 
    ? (position.positionType === 'long' 
        ? (currentPrice - position.purchasePrice) 
        : (position.purchasePrice - currentPrice)
      ) * position.quantity 
    : 0;

  useEffect(() => {
    if (open) {
      // Calculate risk metrics
      const calculatedMaxLoss = MarginService.calculateMaxLoss(
        position,
        stopLoss === "" ? null : Number(stopLoss)
      );
      setMaxLoss(calculatedMaxLoss);
      
      // TODO: Implement margin utilization
      setMarginUtilization(0);
    }
  }, [open, position]);

  const handleClosePosition = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const closeLeg: OptionLeg = {
        symbol: position.symbol,
        quantity: position.quantity,
        action: position.positionType === 'long' ? 'sell' : 'buy',
        ...(position.type !== 'stock' && {
          optionType: position.type as 'call' | 'put'
        }),
        strike: position.strike || 0,
        expiry: position.expiry || '',
        premium: currentPrice || position.currentPrice
      };
      
      await dispatch(closePosition(position.id)).unwrap();
      onClose();
    } catch (err: any) {
      setError(`Failed to close position: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRollPosition = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Create legs for rolling: close current + open new
      const closeLeg: OptionLeg = {
        symbol: position.symbol,
        quantity: position.quantity,
        action: position.positionType === 'long' ? 'sell' : 'buy',
        optionType: position.type === 'stock' ? undefined : position.type,
        strike: position.strike || 0,
        expiry: position.expiry || '',
        premium: currentPrice || position.currentPrice
      };
      
      const newLeg: OptionLeg = {
        symbol: position.symbol,
        quantity: position.quantity,
        action: position.positionType === 'long' ? 'buy' : 'sell',
        ...(position.type !== 'stock' && {
          optionType: position.type as 'call' | 'put'
        }),
        strike: position.strike || 0,
        expiry: position.expiry ? getNextExpiry(position.expiry) : '',
        premium: currentPrice ? currentPrice * 1.05 : position.currentPrice * 1.05
      };
      
      await dispatch(rollPosition({
        positionId: position.id,
        newExpiry: position.expiry ? getNextExpiry(position.expiry) : '',
        newStrike: position.strike || 0
      })).unwrap();
      onClose();
    } catch (err: any) {
      setError(`Failed to roll position: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModifyPosition = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Validate position modification
      const validationError = TradeService.validatePositionModification(
        position,
        stopLoss === '' ? null : Number(stopLoss),
        takeProfit === '' ? null : Number(takeProfit),
        currentPrice || position.currentPrice
      );
      
      if (validationError) {
        setError(validationError);
        return;
      }
      
      await dispatch(modifyPosition({
        positionId: position.id,
        stopLoss: stopLoss === '' ? undefined : Number(stopLoss),
        takeProfit: takeProfit === '' ? undefined : Number(takeProfit)
      })).unwrap();
      onClose();
    } catch (err: any) {
      setError(`Failed to modify position: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to get next expiry (simplified)
  const getNextExpiry = (currentExpiry: string): string => {
    const date = new Date(currentExpiry);
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().split('T')[0];
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Manage Position: {position.symbol}</DialogTitle>
      
      <DialogContent>
        <div style={{ marginBottom: '20px' }}>
          <Typography variant="h6">Position Details</Typography>
          <Typography>Type: {position.positionType} {position.type || 'stock'}</Typography>
          <Typography>Quantity: {position.quantity}</Typography>
          <Typography>Entry Price: ${position.purchasePrice.toFixed(2)}</Typography>
          <Typography>Current Price: ${currentPrice?.toFixed(2) || position.currentPrice.toFixed(2)}</Typography>
          <Typography variant="subtitle1" color={currentPL >= 0 ? 'green' : 'red'}>
            P/L: ${currentPL.toFixed(2)}
          </Typography>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <Typography variant="h6">Risk Management</Typography>
          <Typography>Max Potential Loss: ${maxLoss.toFixed(2)}</Typography>
          <Typography>Probability of Profit: 65% (Estimate)</Typography>
          {marginUtilization > 80 && (
            <Typography color="error">
              Warning: High Margin Utilization ({marginUtilization.toFixed(2)}%)
            </Typography>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <Typography variant="h6">Modify Position</Typography>
          <TextField
            label="Stop Loss"
            type="number"
            value={stopLoss}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStopLoss(e.target.value === '' ? '' : Number(e.target.value))}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Take Profit"
            type="number"
            value={takeProfit}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTakeProfit(e.target.value === '' ? '' : Number(e.target.value))}
            fullWidth
            margin="normal"
          />
        </div>

        {error && (
          <Typography color="error" style={{ margin: '10px 0' }}>
            {error}
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
        <Button 
          onClick={handleClosePosition} 
          color="secondary"
          disabled={isSubmitting}
        >
          {isSubmitting ? <CircularProgress size={24} /> : 'Close Position'}
        </Button>
        <Button 
          onClick={handleRollPosition} 
          color="primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? <CircularProgress size={24} /> : 'Roll Position'}
        </Button>
        <Button 
          onClick={handleModifyPosition} 
          variant="contained" 
          color="primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? <CircularProgress size={24} /> : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PositionModifyDialog;