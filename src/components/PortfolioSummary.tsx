import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import type { Position } from '../redux/portfolioSlice';
import PositionControls from './PositionControls';
import { realTimeService } from '../services/realTimeService';
import './PortfolioSummary.scss';

const PortfolioSummary: React.FC = () => {
  const portfolio = useSelector((state: RootState) => state.portfolio);
  const [connectionStatus, setConnectionStatus] = useState<boolean>(false);
  const [prevPL, setPrevPL] = useState<{[symbol: string]: number}>({});

  // Subscribe to WebSocket connection status
  useEffect(() => {
    const sub = realTimeService.connectionStatus$.subscribe(setConnectionStatus);
    return () => sub.unsubscribe();
  }, []);

  // Get price direction indicator (▲/▼)
  // Track P&L changes
  useEffect(() => {
    const plSub = realTimeService.plUpdates$.subscribe(update => {
      setPrevPL(prev => {
        const newPL = {...prev};
        newPL[update.symbol] = update.pl;
        return newPL;
      });
    });
    return () => plSub.unsubscribe();
  }, []);

  const getPLDirection = (symbol: string, currentPL: number) => {
    if (prevPL[symbol] === undefined) return null;
    return currentPL > prevPL[symbol] ? '▲' : '▼';
  };

  return (
    <div className="portfolio-summary">
      <div className="header">
        <h2>Portfolio Summary</h2>
        <div
          className={`connection-status ${connectionStatus ? 'connected' : 'disconnected'}`}
          data-testid="connection-status-indicator"
        >
          {connectionStatus ? '● Live' : '● Disconnected'}
        </div>
      </div>
      
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
            {portfolio.positions.map(position => {
              const plDirection = getPLDirection(position.symbol, position.unrealizedPL);
              return (
                <li key={position.id} className="position">
                  <div className="symbol">{position.symbol}</div>
                  <div className="details">
                    <span>{position.type} {position.strike ? `@${position.strike}` : ''}</span>
                    <span className="pl">
                      P/L: <span className={`value ${position.unrealizedPL >= 0 ? 'positive' : 'negative'}`}>
                        ${position.unrealizedPL.toFixed(2)}
                        {plDirection && <span className={`direction ${plDirection === '▲' ? 'up' : 'down'}`}>{plDirection}</span>}
                      </span>
                    </span>
                    <span>Qty: {position.quantity}</span>
                  </div>
                  <PositionControls position={position} />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PortfolioSummary;
