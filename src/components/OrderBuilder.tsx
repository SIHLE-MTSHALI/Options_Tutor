import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { addLeg, removeLeg, updateLeg, togglePayoffDiagram, toggleRiskGraph } from '@redux/tradingSlice';
import { executeTradeThunk } from '@redux/tradeThunks';
import { AppDispatch } from '@redux/store';
import { OptionLeg } from '@redux/types';

export function generateContractId(symbol: string, optionType: string, strike?: number, expiry?: string): string {
  const strikePart = strike ? strike : 'NA';
  const expiryPart = expiry ? expiry.replace(/-/g, '') : 'NA';
  return `${symbol}-${optionType.charAt(0).toUpperCase()}${strikePart}-${expiryPart}`;
}

const OrderBuilder: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { legs, showPayoffDiagram, showRiskGraph } = useSelector((state: RootState) => state.trading);
  
  const [newLeg, setNewLeg] = useState<OptionLeg>({
    symbol: 'AAPL',
    optionType: 'call',
    action: 'buy',
    strike: 100,
    expiry: '',
    quantity: 1,
    premium: 0.5,
    id: '',
    contractId: ''
  });
  
  
  const handleAddLeg = () => {
    const contractId = generateContractId(
      newLeg.symbol,
      newLeg.optionType,
      newLeg.strike!,
      newLeg.expiry
    );
    
    dispatch(addLeg({
      ...newLeg,
      contractId,
      id: `leg-${Date.now()}`,
      premium: newLeg.premium || 0
    }));
    
    // Reset form
    setNewLeg({
      symbol: 'AAPL',
      optionType: 'call',
      action: 'buy',
      strike: 100,
      expiry: '',
      quantity: 1,
      premium: 0.5,
      id: '',
      contractId: ''
    });
  };
  
  const handleUpdateLeg = (id: string, field: string, value: any) => {
    dispatch(updateLeg({
      id,
      [field]: value
    } as any));
  };
  
  const handleExecuteTrade = () => {
    dispatch(executeTradeThunk(legs));
  };
  
  return (
    <div className="order-builder">
      <h2>Order Builder</h2>
      
      <div className="leg-form">
        <div className="form-row">
          <label>
            Symbol:
            <input
              type="text"
              value={newLeg.symbol}
              onChange={(e) => setNewLeg({...newLeg, symbol: e.target.value.toUpperCase()})}
            />
          </label>
          
          <label>
            Type:
            <select
              value={newLeg.optionType}
              onChange={(e) => setNewLeg({...newLeg, optionType: e.target.value as 'call' | 'put'})}
            >
              <option value="call">Call</option>
              <option value="put">Put</option>
            </select>
          </label>
        </div>
        
        <div className="form-row">
          <label>
            Action:
            <select
              value={newLeg.action}
              onChange={(e) => setNewLeg({...newLeg, action: e.target.value as 'buy' | 'sell'})}
            >
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </label>
          
          <label>
            Strike:
            <input
              type="number"
              value={newLeg.strike}
              onChange={(e) => setNewLeg({...newLeg, strike: parseFloat(e.target.value)})}
              min="0"
              step="0.5"
            />
          </label>
        </div>
        
        <div className="form-row">
          <label>
            Expiry:
            <input
              type="date"
              value={newLeg.expiry}
              onChange={(e) => setNewLeg({...newLeg, expiry: e.target.value})}
            />
          </label>
          
          <label>
            Quantity:
            <input
              type="number"
              value={newLeg.quantity}
              onChange={(e) => setNewLeg({...newLeg, quantity: parseInt(e.target.value)})}
              min="1"
            />
          </label>
        </div>
        
        <div className="form-row">
          <label>
            Premium:
            <input
              type="number"
              value={newLeg.premium}
              onChange={(e) => setNewLeg({...newLeg, premium: parseFloat(e.target.value)})}
              min="0"
              step="0.01"
            />
          </label>
        </div>
        
        <button onClick={handleAddLeg}>Add Leg</button>
      </div>
      
      <div className="legs-list">
        <h3>Strategy Legs</h3>
        {legs.length === 0 ? (
          <p>No legs added</p>
        ) : (
          <ul>
            {legs.map(leg => (
              <li key={leg.id} className="leg-item">
                <div className="leg-info">
                  <span>{leg.symbol} {leg.action.toUpperCase()} {leg.quantity} {leg.optionType?.toUpperCase()}</span>
                  <span>Strike: ${leg.strike}</span>
                  <span>Exp: {leg.expiry}</span>
                  <span>Premium: ${leg.premium}</span>
                  <span>Contract: {leg.contractId}</span>
                </div>
                <div className="leg-actions">
                  <button onClick={() => leg.id && dispatch(removeLeg(leg.id))}>Remove</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <div className="visualization-controls">
        <label>
          <input
            type="checkbox"
            checked={showPayoffDiagram}
            onChange={() => dispatch(togglePayoffDiagram())}
          />
          Show Payoff Diagram
        </label>
        <label>
          <input
            type="checkbox"
            checked={showRiskGraph}
            onChange={() => dispatch(toggleRiskGraph())}
          />
          Show Risk Graph
        </label>
      </div>
      
      <div className="trade-execution">
        <button onClick={handleExecuteTrade} disabled={legs.length === 0}>
          Execute Trade
        </button>
      </div>
    </div>
  );
};

export default OrderBuilder;
