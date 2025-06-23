import React from 'react';
import { Position, PortfolioState } from '../redux/types';
import { MarketDataState } from '../redux/marketDataSlice';
import { RiskMonitoringService } from '../services/RiskMonitoringService';
import { MarginService } from '../services/MarginService';
import { ETFStrategyState } from '../redux/tradingSlice';

interface RiskDashboardProps {
  portfolio: PortfolioState;
  marketData: MarketDataState;
  cashBalance: number;
}

const RiskDashboard: React.FC<RiskDashboardProps> = ({
  portfolio,
  marketData,
  cashBalance
}) => {
  // Calculate real-time risk metrics
  const positionRisks = portfolio.positions.map(position =>
    RiskMonitoringService.calculatePositionRisk(position, marketData)
  );
  
  const strategyRisks = portfolio.strategies.map((strategy: ETFStrategyState) =>
    RiskMonitoringService.calculateStrategyRisk(strategy, marketData, cashBalance)
  );

  // Calculate portfolio-wide margin utilization
  const totalMargin = positionRisks.reduce(
    (sum, risk) => sum + risk.marginRequirement, 0
  );
  const marginUtilization = MarginService.calculateMarginUtilization(totalMargin, cashBalance);

  return (
    <div className="risk-dashboard">
      <h2>Risk Dashboard</h2>
      
      <div className="portfolio-risk">
        <h3>Portfolio Risk Exposure</h3>
        <div className="metric">
          <span>Total Delta:</span>
          <span>{positionRisks.reduce((sum, risk) => sum + risk.delta, 0).toFixed(2)}</span>
        </div>
        <div className="metric">
          <span>Margin Utilization:</span>
          <span className={marginUtilization.utilization > 0.8 ? 'warning' : ''}>
            {(marginUtilization.utilization * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="position-greeks">
        <h3>Position Greeks</h3>
        <table>
          <thead>
            <tr>
              <th>Position</th>
              <th>Delta</th>
              <th>Gamma</th>
              <th>Theta</th>
              <th>Vega</th>
            </tr>
          </thead>
          <tbody>
            {portfolio.positions.map((position, index) => (
              <tr key={position.id}>
                <td>{position.symbol}</td>
                <td>{positionRisks[index].delta.toFixed(2)}</td>
                <td>{positionRisks[index].gamma.toFixed(2)}</td>
                <td>{positionRisks[index].theta.toFixed(2)}</td>
                <td>{positionRisks[index].vega.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="margin-alerts">
        <h3>Margin Utilization Alerts</h3>
        {marginUtilization.utilization > 0.9 && (
          <div className="alert critical">
            CRITICAL: Margin utilization exceeds 90%
          </div>
        )}
        {marginUtilization.utilization > 0.8 && marginUtilization.utilization <= 0.9 && (
          <div className="alert warning">
            WARNING: Margin utilization exceeds 80%
          </div>
        )}
      </div>
    </div>
  );
};

export default RiskDashboard;