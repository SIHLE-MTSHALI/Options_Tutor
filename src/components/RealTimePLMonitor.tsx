import React, { useEffect, useState } from 'react';
import { RealTimePLService, PortfolioPLSummary } from '../services/RealTimePLService';
import { useAppSelector } from '../redux/hooks';
import './RealTimePLMonitor.scss';

interface RealTimePLMonitorProps {
  updateFrequency?: number; // in milliseconds
  showDetailedMetrics?: boolean;
}

const RealTimePLMonitor: React.FC<RealTimePLMonitorProps> = ({ 
  updateFrequency = 5000, 
  showDetailedMetrics = false 
}) => {
  const [plSummary, setPLSummary] = useState<PortfolioPLSummary | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const positions = useAppSelector(state => state.portfolio.positions);
  const plService = RealTimePLService.getInstance();

  useEffect(() => {
    // Start the real-time P&L service
    plService.start(updateFrequency);
    setIsConnected(true);

    // Subscribe to P&L updates
    const unsubscribe = plService.subscribe((summary: PortfolioPLSummary) => {
      setPLSummary(summary);
      setLastUpdateTime(new Date());
      setError(null);
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
      plService.stop();
      setIsConnected(false);
    };
  }, [updateFrequency]);

  // Force update when positions change
  useEffect(() => {
    if (positions.length > 0 && isConnected) {
      plService.forceUpdate().catch(err => {
        setError(`Failed to update P&L: ${err.message}`);
      });
    }
  }, [positions.length, isConnected]);

  const formatCurrency = (amount: number): string => {
    const sign = amount >= 0 ? '+' : '';
    return `${sign}$${amount.toFixed(2)}`;
  };

  const formatPercent = (percent: number): string => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  const getColorClass = (value: number): string => {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return 'neutral';
  };

  if (!plSummary) {
    return (
      <div className="realtime-pl-monitor loading">
        <div className="status-indicator">
          <span className={`connection-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
          <span>Initializing real-time P&L...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="realtime-pl-monitor">
      <div className="header">
        <h3>Real-Time P&L</h3>
        <div className="status-indicator">
          <span className={`connection-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
          <span className="status-text">
            {isConnected ? 'Live' : 'Disconnected'}
          </span>
          {lastUpdateTime && (
            <span className="last-update">
              Updated: {lastUpdateTime.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="pl-summary">
        <div className="metric-row">
          <div className="metric">
            <label>Total Portfolio Value</label>
            <span className="value large">
              ${plSummary.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="metric-row">
          <div className="metric">
            <label>Unrealized P&L</label>
            <span className={`value ${getColorClass(plSummary.totalUnrealizedPL)}`}>
              {formatCurrency(plSummary.totalUnrealizedPL)}
            </span>
          </div>
          <div className="metric">
            <label>Realized P&L</label>
            <span className={`value ${getColorClass(plSummary.totalRealizedPL)}`}>
              {formatCurrency(plSummary.totalRealizedPL)}
            </span>
          </div>
        </div>

        <div className="metric-row">
          <div className="metric">
            <label>Day Change</label>
            <span className={`value ${getColorClass(plSummary.dayChange)}`}>
              {formatCurrency(plSummary.dayChange)}
            </span>
          </div>
          <div className="metric">
            <label>Day Change %</label>
            <span className={`value ${getColorClass(plSummary.dayChangePercent)}`}>
              {formatPercent(plSummary.dayChangePercent)}
            </span>
          </div>
        </div>
      </div>

      {showDetailedMetrics && plSummary.positions.length > 0 && (
        <div className="position-details">
          <h4>Position Details</h4>
          <div className="position-list">
            {plSummary.positions.map((position) => (
              <div key={position.positionId} className="position-item">
                <div className="position-header">
                  <span className="symbol">{position.symbol}</span>
                  <span className="current-price">
                    ${position.currentPrice.toFixed(2)}
                  </span>
                </div>
                <div className="position-metrics">
                  <div className="metric small">
                    <label>P&L</label>
                    <span className={`value ${getColorClass(position.unrealizedPL)}`}>
                      {formatCurrency(position.unrealizedPL)}
                    </span>
                  </div>
                  <div className="metric small">
                    <label>% Change</label>
                    <span className={`value ${getColorClass(position.percentChange)}`}>
                      {formatPercent(position.percentChange)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="footer">
        <span className="update-frequency">
          Updates every {updateFrequency / 1000}s
        </span>
        <span className="position-count">
          {plSummary.positions.length} position{plSummary.positions.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
};

export default RealTimePLMonitor;