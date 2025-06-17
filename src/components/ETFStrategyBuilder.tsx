import React, { useState } from 'react';
import { useAppDispatch } from '../redux/hooks';
import type { ETFStrategyConfig } from '../redux/types';
import { applyETFStrategy } from '../redux/etfStrategyThunks';

const ETFStrategyBuilder: React.FC = () => {
  const [strategy, setStrategy] = useState<ETFStrategyConfig>({
    name: '',
    legs: [],
    description: ''
  });

  const dispatch = useAppDispatch();

  const handleApplyStrategy = () => {
    dispatch(applyETFStrategy(strategy));
  };

  return (
    <div className="strategy-builder">
      <h3>ETF Income Strategy</h3>
      <div className="form-group">
        <label>Strategy Name</label>
        <input
          type="text"
          value={strategy.name}
          onChange={(e) => setStrategy({...strategy, name: e.target.value})}
        />
      </div>
      <div className="form-group">
        <label>Description</label>
        <textarea
          value={strategy.description}
          onChange={(e) => setStrategy({...strategy, description: e.target.value})}
        />
      </div>
      {/* Additional form fields will be added */}
      <button onClick={handleApplyStrategy}>Apply Strategy</button>
    </div>
  );
};

export default ETFStrategyBuilder;