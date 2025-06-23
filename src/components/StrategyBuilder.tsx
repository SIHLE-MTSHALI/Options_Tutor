import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { 
  applyETFStrategy, 
  mstyCoveredCallThunk, 
  pltyCashSecuredPutThunk, 
  tslyCollarStrategyThunk 
} from '../redux/etfStrategyThunks';
import { ETFStrategyConfig, StrategyType } from '../redux/types';
import { TradeExecutionError } from '../services/errors/TradeExecutionError';
import './StrategyBuilder.scss';

interface StrategyBuilderProps {
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
}

interface StrategyTemplate {
  type: StrategyType;
  name: string;
  description: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  expectedReturn: string;
  maxLoss: string;
  requirements: string[];
  icon: string;
}

const strategyTemplates: StrategyTemplate[] = [
  {
    type: 'covered-call',
    name: 'Covered Call',
    description: 'Own 100 shares and sell a call option to generate income',
    riskLevel: 'Low',
    expectedReturn: '2-5% monthly',
    maxLoss: 'Stock decline',
    requirements: ['Own 100+ shares', 'Neutral to slightly bullish outlook'],
    icon: '📈'
  },
  {
    type: 'cash-secured-put',
    name: 'Cash-Secured Put',
    description: 'Sell a put option while holding cash to buy shares if assigned',
    riskLevel: 'Medium',
    expectedReturn: '1-3% monthly',
    maxLoss: 'Strike price - premium',
    requirements: ['Cash equal to 100 shares', 'Willing to own stock'],
    icon: '💰'
  },
  {
    type: 'collar',
    name: 'Collar Strategy',
    description: 'Own stock, sell call, buy put for downside protection',
    riskLevel: 'Low',
    expectedReturn: '1-2% monthly',
    maxLoss: 'Limited by protective put',
    requirements: ['Own 100+ shares', 'Want downside protection'],
    icon: '🛡️'
  },
  {
    type: 'custom',
    name: 'Custom Strategy',
    description: 'Build your own multi-leg options strategy',
    riskLevel: 'High',
    expectedReturn: 'Variable',
    maxLoss: 'Depends on strategy',
    requirements: ['Advanced knowledge', 'Risk management'],
    icon: '🔧'
  }
];

const StrategyBuilder: React.FC<StrategyBuilderProps> = ({ 
  selectedSymbol, 
  onSymbolChange 
}) => {
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType>('covered-call');
  const [strategyConfig, setStrategyConfig] = useState<ETFStrategyConfig>({
    type: 'covered-call',
    symbol: selectedSymbol,
    quantity: 1,
    strike: 0,
    expiry: '',
    putStrike: 0
  });
  const [isSimulation, setIsSimulation] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const dispatch = useAppDispatch();
  const portfolio = useAppSelector(state => state.portfolio);
  const marketData = useAppSelector(state => state.marketData);

  // Update strategy config when symbol changes
  useEffect(() => {
    setStrategyConfig(prev => ({
      ...prev,
      symbol: selectedSymbol
    }));
  }, [selectedSymbol]);

  // Get current stock price for calculations
  const getCurrentPrice = (): number => {
    return marketData.stockQuotes[selectedSymbol]?.price || getDefaultPrice(selectedSymbol);
  };

  const getDefaultPrice = (symbol: string): number => {
    const defaultPrices: Record<string, number> = {
      'MSTY': 45,
      'PLTY': 28,
      'TSLY': 35,
      'SPY': 400,
      'QQQ': 350
    };
    return defaultPrices[symbol] || 100;
  };

  // Generate expiry dates (next 4 monthly expirations)
  const getExpiryDates = (): string[] => {
    const dates: string[] = [];
    const now = new Date();
    
    for (let i = 0; i < 4; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i + 1, 15); // 3rd Friday approximation
      dates.push(date.toISOString().split('T')[0]);
    }
    
    return dates;
  };

  // Generate strike prices around current price
  const getStrikePrices = (): number[] => {
    const currentPrice = getCurrentPrice();
    const strikes: number[] = [];
    const step = currentPrice > 100 ? 5 : 1;
    
    for (let i = -5; i <= 5; i++) {
      strikes.push(Math.round((currentPrice + (i * step)) / step) * step);
    }
    
    return strikes.filter(strike => strike > 0);
  };

  const handleStrategyChange = (type: StrategyType) => {
    setSelectedStrategy(type);
    setStrategyConfig(prev => ({
      ...prev,
      type,
      strike: type === 'covered-call' ? getCurrentPrice() * 1.05 : getCurrentPrice() * 0.95,
      putStrike: type === 'collar' ? getCurrentPrice() * 0.9 : undefined
    }));
    setError(null);
    setExecutionResult(null);
  };

  const handleConfigChange = (field: keyof ETFStrategyConfig, value: any) => {
    setStrategyConfig(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  const validateStrategy = (): string | null => {
    if (!strategyConfig.symbol) return 'Symbol is required';
    if (!strategyConfig.quantity || strategyConfig.quantity <= 0) return 'Quantity must be positive';
    if (!strategyConfig.strike || strategyConfig.strike <= 0) return 'Strike price must be positive';
    if (!strategyConfig.expiry) return 'Expiry date is required';
    
    if (strategyConfig.type === 'collar' && (!strategyConfig.putStrike || strategyConfig.putStrike <= 0)) {
      return 'Put strike is required for collar strategy';
    }

    // Check if user has enough cash/positions for the strategy
    if (!isSimulation) {
      if (strategyConfig.type === 'covered-call') {
        const hasShares = portfolio.positions.some(p => 
          p.symbol === strategyConfig.symbol && 
          p.type === 'stock' && 
          p.quantity >= strategyConfig.quantity * 100
        );
        if (!hasShares) {
          return `You need at least ${strategyConfig.quantity * 100} shares of ${strategyConfig.symbol} for a covered call`;
        }
      }
      
      if (strategyConfig.type === 'cash-secured-put') {
        const requiredCash = strategyConfig.strike * strategyConfig.quantity * 100;
        if (portfolio.cashBalance < requiredCash) {
          return `You need $${requiredCash.toLocaleString()} cash for this cash-secured put`;
        }
      }
    }

    return null;
  };

  const executeStrategy = async () => {
    const validationError = validateStrategy();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsExecuting(true);
    setError(null);
    setExecutionResult(null);

    try {
      let result;
      
      if (selectedStrategy === 'covered-call' && strategyConfig.symbol === 'MSTY') {
        result = await dispatch(mstyCoveredCallThunk({
          strike: strategyConfig.strike,
          expiry: strategyConfig.expiry,
          quantity: strategyConfig.quantity,
          simulate: isSimulation
        })).unwrap();
      } else if (selectedStrategy === 'cash-secured-put' && strategyConfig.symbol === 'PLTY') {
        result = await dispatch(pltyCashSecuredPutThunk({
          strike: strategyConfig.strike,
          expiry: strategyConfig.expiry,
          quantity: strategyConfig.quantity,
          simulate: isSimulation
        })).unwrap();
      } else if (selectedStrategy === 'collar' && strategyConfig.symbol === 'TSLY') {
        result = await dispatch(tslyCollarStrategyThunk({
          callStrike: strategyConfig.strike,
          putStrike: strategyConfig.putStrike!,
          expiry: strategyConfig.expiry,
          quantity: strategyConfig.quantity,
          simulate: isSimulation
        })).unwrap();
      } else {
        // Generic strategy execution
        result = await dispatch(applyETFStrategy({
          strategyConfig,
          simulate: isSimulation
        })).unwrap();
      }

      setExecutionResult(
        isSimulation 
          ? `Strategy simulated successfully! Margin required: $${result.toFixed(2)}`
          : `Strategy executed successfully! Margin used: $${result.toFixed(2)}`
      );
    } catch (err) {
      if (err instanceof TradeExecutionError) {
        setError(err.toUserMessage());
      } else {
        setError(`Strategy execution failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    } finally {
      setIsExecuting(false);
    }
  };

  const calculateEstimatedReturn = (): string => {
    const currentPrice = getCurrentPrice();
    const premium = currentPrice * 0.02; // Estimated 2% premium
    const returnPercent = (premium / currentPrice) * 100;
    return `~${returnPercent.toFixed(2)}%`;
  };

  const calculateMaxRisk = (): string => {
    const currentPrice = getCurrentPrice();
    
    switch (selectedStrategy) {
      case 'covered-call':
        return `Stock decline (unlimited)`;
      case 'cash-secured-put':
        return `$${((strategyConfig.strike || currentPrice) * strategyConfig.quantity * 100).toLocaleString()}`;
      case 'collar':
        const putStrike = strategyConfig.putStrike || currentPrice * 0.9;
        return `$${((currentPrice - putStrike) * strategyConfig.quantity * 100).toFixed(0)}`;
      default:
        return 'Variable';
    }
  };

  const selectedTemplate = strategyTemplates.find(t => t.type === selectedStrategy);

  return (
    <div className="strategy-builder">
      <div className="builder-header">
        <h2>Strategy Builder</h2>
        <div className="mode-toggle">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={isSimulation}
              onChange={(e) => setIsSimulation(e.target.checked)}
            />
            <span className="slider"></span>
            <span className="toggle-label">
              {isSimulation ? 'Simulation' : 'Live Trading'}
            </span>
          </label>
        </div>
      </div>

      {/* Strategy Selection */}
      <div className="strategy-selection">
        <h3>Choose Strategy</h3>
        <div className="strategy-grid">
          {strategyTemplates.map(template => (
            <div
              key={template.type}
              className={`strategy-card ${selectedStrategy === template.type ? 'selected' : ''}`}
              onClick={() => handleStrategyChange(template.type)}
            >
              <div className="card-header">
                <span className="strategy-icon">{template.icon}</span>
                <h4>{template.name}</h4>
                <span className={`risk-badge ${template.riskLevel.toLowerCase()}`}>
                  {template.riskLevel}
                </span>
              </div>
              <p className="strategy-description">{template.description}</p>
              <div className="strategy-metrics">
                <div className="metric">
                  <label>Expected Return</label>
                  <span>{template.expectedReturn}</span>
                </div>
                <div className="metric">
                  <label>Max Loss</label>
                  <span>{template.maxLoss}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strategy Configuration */}
      {selectedTemplate && (
        <div className="strategy-config">
          <h3>Configure {selectedTemplate.name}</h3>
          
          <div className="config-form">
            <div className="form-row">
              <div className="form-group">
                <label>Symbol</label>
                <select
                  value={strategyConfig.symbol}
                  onChange={(e) => {
                    handleConfigChange('symbol', e.target.value);
                    onSymbolChange(e.target.value);
                  }}
                >
                  <option value="MSTY">MSTY - YieldMax TSLA Option Income Strategy ETF</option>
                  <option value="PLTY">PLTY - YieldMax PLTR Option Income Strategy ETF</option>
                  <option value="TSLY">TSLY - YieldMax TSLA Option Income Strategy ETF</option>
                  <option value="SPY">SPY - SPDR S&P 500 ETF Trust</option>
                  <option value="QQQ">QQQ - Invesco QQQ Trust</option>
                </select>
              </div>

              <div className="form-group">
                <label>Quantity (Contracts)</label>
                <input
                  type="number"
                  min="1"
                  value={strategyConfig.quantity}
                  onChange={(e) => handleConfigChange('quantity', parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>
                  {selectedStrategy === 'cash-secured-put' ? 'Put Strike' : 'Call Strike'}
                </label>
                <select
                  value={strategyConfig.strike}
                  onChange={(e) => handleConfigChange('strike', parseFloat(e.target.value))}
                >
                  {getStrikePrices().map(strike => (
                    <option key={strike} value={strike}>
                      ${strike} {strike > getCurrentPrice() ? '(OTM)' : strike < getCurrentPrice() ? '(ITM)' : '(ATM)'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Expiry Date</label>
                <select
                  value={strategyConfig.expiry}
                  onChange={(e) => handleConfigChange('expiry', e.target.value)}
                >
                  <option value="">Select expiry...</option>
                  {getExpiryDates().map(date => (
                    <option key={date} value={date}>
                      {new Date(date).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedStrategy === 'collar' && (
              <div className="form-row">
                <div className="form-group">
                  <label>Put Strike (Protection)</label>
                  <select
                    value={strategyConfig.putStrike || ''}
                    onChange={(e) => handleConfigChange('putStrike', parseFloat(e.target.value))}
                  >
                    {getStrikePrices().filter(strike => strike < getCurrentPrice()).map(strike => (
                      <option key={strike} value={strike}>
                        ${strike} (OTM)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Strategy Analysis */}
          <div className="strategy-analysis">
            <h4>Strategy Analysis</h4>
            <div className="analysis-grid">
              <div className="analysis-item">
                <label>Current Price</label>
                <span>${getCurrentPrice().toFixed(2)}</span>
              </div>
              <div className="analysis-item">
                <label>Estimated Return</label>
                <span className="positive">{calculateEstimatedReturn()}</span>
              </div>
              <div className="analysis-item">
                <label>Max Risk</label>
                <span className="negative">{calculateMaxRisk()}</span>
              </div>
              <div className="analysis-item">
                <label>Break Even</label>
                <span>${(strategyConfig.strike || getCurrentPrice()).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Requirements Check */}
          <div className="requirements-check">
            <h4>Requirements</h4>
            <ul>
              {selectedTemplate.requirements.map((req, index) => (
                <li key={index} className="requirement-item">
                  <span className="check-icon">✓</span>
                  {req}
                </li>
              ))}
            </ul>
          </div>

          {/* Error Display */}
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {/* Success Display */}
          {executionResult && (
            <div className="success-message">
              <span className="success-icon">✅</span>
              {executionResult}
            </div>
          )}

          {/* Execute Button */}
          <div className="execute-section">
            <button
              className="execute-btn"
              onClick={executeStrategy}
              disabled={isExecuting || !strategyConfig.expiry}
            >
              {isExecuting ? (
                <>
                  <span className="loading-spinner"></span>
                  Executing...
                </>
              ) : (
                <>
                  {isSimulation ? 'Simulate Strategy' : 'Execute Strategy'}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StrategyBuilder;