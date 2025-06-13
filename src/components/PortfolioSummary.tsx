import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import type { Position } from '../redux/portfolioSlice';

const PortfolioSummary: React.FC = () => {
  const portfolio = useSelector((state: RootState) => state.portfolio);
  
  return (
    <div className="portfolio-summary">
      <h2>Portfolio Summary</h2>
      <div className="metrics">
        <div className="metric">
          <span className="label">Cash Balance:</span>
          <span className="value">${portfolio.cashBalance.toFixed(2)}</span>
        </div>
        <div className="metric">
          <span className="label">Unrealized P/L:</span>
          <span className={`value ${portfolio.unrealizedPL >= 0 ? 'positive' : 'negative'}`}>
            {portfolio.unrealizedPL >= 0 ? '+' : ''}{portfolio.unrealizedPL.toFixed(2)}
          </span>
        </div>
        <div className="metric">
          <span className="label">Realized P/L:</span>
          <span className={`value ${portfolio.realizedPL >= 0 ? 'positive' : 'negative'}`}>
            {portfolio.realizedPL >= 0 ? '+' : ''}{portfolio.realizedPL.toFixed(2)}
          </span>
        </div>
        <div className="metric">
          <span className="label">Margin Usage:</span>
          <span className={`value ${portfolio.marginUsage > 80 ? 'critical' : portfolio.marginUsage > 60 ? 'warning' : ''}`}>
            {portfolio.marginUsage.toFixed(2)}%
          </span>
        </div>
      </div>
      
      <div className="positions">
        <h3>Positions</h3>
        {portfolio.positions.length === 0 ? (
          <p>No open positions</p>
        ) : (
          <ul>
            {portfolio.positions.map(position => (
              <li key={position.id} className="position">
                <div className="symbol">{position.symbol}</div>
                <div className="details">
                  <span>{position.type} {position.strike ? `@${position.strike}` : ''}</span>
                  <span>Qty: {position.quantity}</span>
                </div>
                <div className="prices">
                  <div className={`price ${position.currentPrice >= position.purchasePrice ? 'positive' : 'negative'}`}>
                    ${position.currentPrice.toFixed(2)}
                  </div>
                  <div className={`pl ${calculatePositionUnrealizedPL(position) >= 0 ? 'positive' : 'negative'}`}>
                    {calculatePositionUnrealizedPL(position) >= 0 ? '+' : ''}{calculatePositionUnrealizedPL(position).toFixed(2)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
  const calculatePositionUnrealizedPL = (position: Position) => {
    return (position.currentPrice - position.purchasePrice) * position.quantity;
  };
};

export default PortfolioSummary;
