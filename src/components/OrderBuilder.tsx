import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { addLeg, removeLeg, updateLeg, executeTrade, togglePayoffDiagram, toggleRiskGraph } from '@redux/tradingSlice';

const OrderBuilder: React.FC = () => {
  const dispatch = useDispatch();
  const { legs, showPayoffDiagram, showRiskGraph } = useSelector((state: RootState) => state.trading);
  
  const [newLeg, setNewLeg] = useState({
    type: 'call' as 'call' | 'put',
    action: 'buy' as 'buy' | 'sell',
    strike: 100,
    expiry: '',
    quantity: 1,
    premium: 0.5
  });
  
  const handleAddLeg = () => {
    dispatch(addLeg({
      ...newLeg,
      id: `leg-${Date.now()}`
    }));
    // Reset form
    setNewLeg({
      type: 'call',
      action: 'buy',
      strike: 100,
      expiry: '',
      quantity: 1,
      premium: 0.5
    });
  };
  
  const handleUpdateLeg = (id: string, field: string, value: any) => {
    dispatch(updateLeg({
      id,
      [field]: value
    } as any));
  };
  
  const handleExecuteTrade = () => {
    dispatch(executeTrade());
  };
  
  return (
    <div className="order-builder">
      <h2>Order Builder</h2>
      
      <div className="leg-form">
        <div className="form-row">
          <label>
            Type:
            <select 
              value={newLeg.type} 
              onChange={(e) => setNewLeg({...newLeg, type: e.target.value as 'call' | 'put'})}
            >
              <option value="call">Call</option>
              <option value="put">Put</option>
            </select>
          </label>
          
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
        </div>
        
        <div className="form-row">
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
          
          <label>
            Expiry:
            <input 
              type="date" 
              value={newLeg.expiry} 
              onChange={(e) => setNewLeg({...newLeg, expiry: e.target.value})}
            />
          </label>
        </div>
        
        <div className="form-row">
          <label>
            Quantity:
            <input 
              type="number" 
              value={newLeg.quantity} 
              onChange={(e) => setNewLeg({...newLeg, quantity: parseInt(e.target.value)})}
              min="1"
            />
          </label>
          
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
                  <span>{leg.action.toUpperCase()} {leg.quantity} {leg.type.toUpperCase()}</span>
                  <span>Strike: ${leg.strike}</span>
                  <span>Exp: {leg.expiry}</span>
                  <span>Premium: ${leg.premium}</span>
                </div>
                <div className="leg-actions">
                  <button onClick={() => dispatch(removeLeg(leg.id))}>Remove</button>
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
