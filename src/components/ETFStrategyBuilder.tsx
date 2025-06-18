import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import type { ETFStrategyConfig, Position } from '../redux/types';
import {
  applyETFStrategy,
  mstyCoveredCallThunk,
  pltyCashSecuredPutThunk,
  tslyCollarStrategyThunk
} from '../redux/etfStrategyThunks';
import { portfolioActions } from '../redux/portfolioSlice';
import { PositionModifyDialog } from './PositionModifyDialog';
import { Chart } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const ETFStrategyBuilder: React.FC = () => {
  const [strategy, setStrategy] = useState<ETFStrategyConfig>({
    name: '',
    legs: [],
    description: '',
    type: 'covered-call',
    symbol: 'MSTY',
    quantity: 100,
    strike: 50,
    expiry: '2023-12-15'
  });
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  
  const dispatch = useAppDispatch();
  const unrealizedPL = useAppSelector(state => state.portfolio.unrealizedPL);
  const marginUsage = useAppSelector(state => state.portfolio.marginUsage);
  const strategyProfitLoss = useAppSelector(state => state.portfolio.strategyProfitLoss[strategy.name] || 0);
  const positions = useAppSelector(state => state.portfolio.positions);
  const cashBalance = useAppSelector(state => state.portfolio.cashBalance);
  
  const [modifyDialogOpen, setModifyDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [yieldProgress, setYieldProgress] = useState(0);
  
  const handleModifyPosition = (modifiedPosition: Position) => {
    // Dispatch action to update position in Redux store
    dispatch(portfolioActions.modifyPosition(modifiedPosition));
    setModifyDialogOpen(false);
  };

  // Calculate 3% yield target progress
  useEffect(() => {
    if (cashBalance > 0) {
      const targetYield = cashBalance * 0.03;
      const actualYield = strategyProfitLoss;
      const progress = Math.min(100, (actualYield / targetYield) * 100);
      setYieldProgress(progress);
    }
  }, [strategyProfitLoss, cashBalance]);

  const handleApplyStrategy = async () => {
    setStatus('pending');
    try {
      // Execute strategy based on type
      switch(strategy.type) {
        case 'covered-call':
          await dispatch(mstyCoveredCallThunk({
            symbol: strategy.symbol || 'MSTY',
            quantity: strategy.quantity || 100,
            strike: strategy.strike || 50,
            expiry: strategy.expiry || '2023-12-15'
          })).unwrap();
          break;
        case 'cash-secured-put':
          await dispatch(pltyCashSecuredPutThunk({
            symbol: strategy.symbol || 'PLTY',
            quantity: strategy.quantity || 100,
            strike: strategy.strike || 30,
            expiry: strategy.expiry || '2023-12-15'
          })).unwrap();
          break;
        case 'collar':
          await dispatch(tslyCollarStrategyThunk({
            symbol: strategy.symbol || 'TSLY',
            quantity: strategy.quantity || 100,
            callStrike: strategy.strike || 12,
            putStrike: strategy.putStrike || (strategy.strike || 12) * 0.9,
            expiry: strategy.expiry || '2023-12-15'
          })).unwrap();
          break;
        default:
          await dispatch(applyETFStrategy(strategy)).unwrap();
      }
      
      setStatus('success');
      // Reset success status after 3 seconds
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      setStatus('error');
    }
  };

  // Determine margin meter color and warning
  let meterColor = 'green';
  let warningText = '';
  if (marginUsage >= 60 && marginUsage < 80) {
    meterColor = 'amber';
    warningText = 'Amber Warning: Margin utilization approaching high levels';
  } else if (marginUsage >= 80) {
    meterColor = 'red';
    warningText = 'Red Warning: Margin utilization at critical levels!';
  }

  // Chart data for IRR vs Dividend Yield
  const chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        type: 'line' as const,
        label: 'IRR (%)',
        borderColor: 'rgb(54, 162, 235)',
        borderWidth: 2,
        data: [12, 15, 18, 14, 16, 20],
      },
      {
        type: 'bar' as const,
        label: 'Dividend Yield (%)',
        backgroundColor: 'rgb(75, 192, 192)',
        data: [8, 7, 9, 8, 8, 10],
      },
    ],
  };

  return (
    <div className="strategy-builder">
      <h3>ETF Income Strategy</h3>
      
      {/* Performance Metrics */}
      <div className="performance-metrics">
        <div className="metric">
          <span className="label">Real-time P/L:</span>
          <div className="pl-trend">
            <span className={`value ${unrealizedPL >= 0 ? 'positive' : 'negative'}`}>
              {unrealizedPL >= 0 ? '↑' : '↓'} ${Math.abs(unrealizedPL).toFixed(2)}
            </span>
            <span className={`strategy-pl ${strategyProfitLoss >= 0 ? 'positive' : 'negative'}`}>
              (Strategy: {strategyProfitLoss >= 0 ? '+' : ''}{strategyProfitLoss.toFixed(2)})
            </span>
          </div>
        </div>
        
        <div className="metric">
          <span className="label">Margin Utilization:</span>
          <div className="margin-meter">
            <div
              className="meter-bar"
              style={{
                width: `${marginUsage}%`,
                backgroundColor: meterColor
              }}
            ></div>
            <span className="meter-value">{marginUsage.toFixed(0)}%</span>
            {warningText && <div className={`margin-warning ${meterColor}`}>{warningText}</div>}
          </div>
        </div>
      </div>
      
      {/* Strategy Form */}
      <div className="strategy-form">
        <div className="form-group">
          <label>Strategy Type</label>
          <select
            value={strategy.type}
            onChange={(e) => setStrategy({...strategy, type: e.target.value as any})}
          >
            <option value="covered-call">Covered Call (MSTY)</option>
            <option value="cash-secured-put">Cash-Secured Put (PLTY)</option>
            <option value="collar">Collar Strategy (TSLY)</option>
            <option value="custom">Custom Strategy</option>
          </select>
        </div>
        
        {strategy.type === 'custom' && (
          <>
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
          </>
        )}
        
        <div className="form-group">
          <label>ETF Symbol</label>
          <input
            type="text"
            value={strategy.symbol}
            onChange={(e) => setStrategy({...strategy, symbol: e.target.value})}
          />
        </div>
        
        <div className="form-group">
          <label>Quantity</label>
          <input
            type="number"
            value={strategy.quantity}
            onChange={(e) => setStrategy({...strategy, quantity: parseInt(e.target.value) || 0})}
          />
        </div>
        
        <div className="form-group">
          <label>Strike Price</label>
          <input
            type="number"
            step="0.01"
            value={strategy.strike}
            onChange={(e) => setStrategy({...strategy, strike: parseFloat(e.target.value) || 0})}
          />
        </div>
        
        {strategy.type === 'collar' && (
          <div className="form-group">
            <label>Put Strike Price</label>
            <input
              type="number"
              step="0.01"
              value={strategy.putStrike || ''}
              onChange={(e) => setStrategy({...strategy, putStrike: parseFloat(e.target.value) || 0})}
            />
          </div>
        )}
        
        <div className="form-group">
          <label>Expiry Date</label>
          <input
            type="date"
            value={strategy.expiry}
            onChange={(e) => setStrategy({...strategy, expiry: e.target.value})}
          />
        </div>
      </div>

      {/* Position Controls */}
      <div className="position-controls">
        <button
          className="modify-btn"
          onClick={() => {
            if (positions.length > 0) {
              setSelectedPosition(positions[0]);
              setModifyDialogOpen(true);
            }
          }}
          disabled={positions.length === 0}
        >
          Modify Position
        </button>
        <button
          className="close-btn"
          onClick={() => {
            if (positions.length > 0) {
              dispatch(portfolioActions.closePosition({
                id: positions[0].id,
                closePrice: positions[0].currentPrice
              }));
            }
          }}
          disabled={positions.length === 0}
        >
          Close Position
        </button>
      </div>
      
      {/* Action and Status */}
      <div className="action-section">
        <button
          onClick={handleApplyStrategy}
          disabled={status === 'pending'}
          className={status === 'pending' ? 'pending' : ''}
        >
          {status === 'pending' ? 'Executing...' : 'Apply Strategy'}
        </button>
        
        {status === 'pending' && (
          <div className="status-indicator">
            <div className="spinner"></div>
            <span>Executing strategy...</span>
          </div>
        )}
        {status === 'success' && (
          <div className="status success">
            <span>✓ Strategy executed successfully!</span>
          </div>
        )}
        {status === 'error' && (
          <div className="status error">
            <span>✗ Strategy execution failed</span>
          </div>
        )}
      </div>
      
      {/* Charts Section */}
      <div className="charts-section">
        <div className="chart">
          <h4>IRR vs. Dividend Yield</h4>
          <Chart type='bar' data={chartData} />
        </div>
        <div className="chart">
          <h4>3% Yield Progress</h4>
          <div className="progress-container">
            <div className="progress-bar">
              <div
                className="progress"
                style={{ width: `${yieldProgress}%` }}
              ></div>
            </div>
            <div className="progress-label">
              {yieldProgress.toFixed(1)}% of target
            </div>
            <div className="target-line" style={{ left: '100%' }}></div>
          </div>
        </div>
      </div>
      
      {selectedPosition && (
        <PositionModifyDialog
          onClose={() => setModifyDialogOpen(false)}
          position={selectedPosition}
          onModify={handleModifyPosition}
        />
      )}
    </div>
  );
};

export default ETFStrategyBuilder;