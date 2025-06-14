import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Position } from '../redux/portfolioSlice';
import type { RootState } from '../redux/store';
import { modifyPosition } from '../redux/portfolioSlice';
import '../styles/Dialog.scss';

interface PositionModifyDialogProps {
  position: Position;
  onClose: () => void;
}

export const PositionModifyDialog: React.FC<PositionModifyDialogProps> = ({
  position,
  onClose
}) => {
  const dispatch = useDispatch();
  const [stopLoss, setStopLoss] = React.useState<number | undefined>(position.stopLoss);
  const [takeProfit, setTakeProfit] = React.useState<number | undefined>(position.takeProfit);
  const isPending = useSelector((state: RootState) => state.portfolio.isPending);
  
  const handleSave = () => {
    dispatch(modifyPosition({
      id: position.id,
      stopLoss,
      takeProfit
    }));
    onClose();
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog">
        <h3>Modify Position: {position.symbol}</h3>
        
        <div className="form-group">
          <label>Stop Loss</label>
          <input 
            type="number"
            value={stopLoss || ''}
            onChange={e => setStopLoss(e.target.value ? Number(e.target.value) : undefined)}
            placeholder="Enter stop loss price"
          />
        </div>
        
        <div className="form-group">
          <label>Take Profit</label>
          <input 
            type="number"
            value={takeProfit || ''}
            onChange={e => setTakeProfit(e.target.value ? Number(e.target.value) : undefined)}
            placeholder="Enter take profit price"
          />
        </div>
        
        <div className="dialog-actions">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};