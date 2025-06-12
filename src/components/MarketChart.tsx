import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';

const MarketChart: React.FC = () => {
  const { selectedSymbol, currentPrice, volatility } = useSelector((state: RootState) => state.marketData);
  
  return (
    <div className="market-chart">
      <div className="chart-header">
        <h2>{selectedSymbol || 'Select a Symbol'}</h2>
        <div className="chart-tools">
          <button>Payoff Diagram</button>
          <button>Risk Graph</button>
          <button>Greek Heatmap</button>
        </div>
      </div>
      
      <div className="chart-container">
        {/* Chart will go here - we'll use a charting library later */}
        <div className="chart-placeholder">
          {selectedSymbol ? (
            <>
              <p>Live price chart for {selectedSymbol}</p>
              <p>Last price: ${currentPrice.toFixed(2)}</p>
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
