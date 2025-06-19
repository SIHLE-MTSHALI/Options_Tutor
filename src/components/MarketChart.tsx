import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import type { ETFStrategyConfig } from '../redux/types';

interface MarketChartProps {
  strategy?: ETFStrategyConfig;
}

const MarketChart: React.FC<MarketChartProps> = ({ strategy }) => {
  const { selectedSymbol, currentPrice, volatility } = useSelector((state: RootState) => state.marketData);
  
  const displaySymbol = strategy?.symbol || selectedSymbol;
  
  return (
    <div className="market-chart">
      <div className="chart-header">
        <h2>{displaySymbol || 'Select a Symbol'}</h2>
        <div className="chart-tools">
          <button>Payoff Diagram</button>
          <button>Risk Graph</button>
          <button>Greek Heatmap</button>
        </div>
      </div>
      
      <div className="chart-container">
        {/* Chart will go here - we'll use a charting library later */}
        <div className="chart-placeholder">
          {displaySymbol ? (
            <>
              <p>Live price chart for {displaySymbol}</p>
              <p>Last price: ${currentPrice.toFixed(2)}</p>
              {strategy && <p>Strategy: {strategy.type}</p>}
            </>
          ) : (
            <p>Please select a symbol to view chart</p>
          )}
        </div>
      </div>
      
      <div className="chart-footer">
        <div className="price-info">
          <span>IV: {(volatility * 100).toFixed(2)}%</span>
        </div>
        <div className="time-controls">
          <select>
            <option>1D</option>
            <option>1W</option>
            <option>1M</option>
            <option>3M</option>
            <option>1Y</option>
          </select>
          <button>1x</button>
          <button>5x</button>
          <button>20x</button>
        </div>
      </div>
    </div>
  );
};

export default MarketChart;
