import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../redux/hooks';
import PortfolioSummary from './PortfolioSummary';
import RealTimePLMonitor from './RealTimePLMonitor';
import AdvancedMarketChart from './AdvancedMarketChart';
import StrategyBuilder from './StrategyBuilder';
import EnhancedEducationalPanel from './EnhancedEducationalPanel';
import MarketDataPanel from './MarketDataPanel';
import RiskDashboard from './RiskDashboard';
import './TradingDashboard.scss';

type ViewMode = 'trading' | 'learning' | 'analysis' | 'portfolio';
type LayoutMode = 'standard' | 'focus' | 'compact';

const TradingDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewMode>('trading');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('standard');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('MSTY');
  const [showEducationalPanel, setShowEducationalPanel] = useState(false);
  
  const portfolio = useAppSelector(state => state.portfolio);
  const marketData = useAppSelector(state => state.marketData);
  const dispatch = useAppDispatch();

  // Auto-select symbol from positions if available
  useEffect(() => {
    if (portfolio.positions.length > 0 && !selectedSymbol) {
      setSelectedSymbol(portfolio.positions[0].symbol);
    }
  }, [portfolio.positions, selectedSymbol]);

  const renderMainContent = () => {
    switch (activeView) {
      case 'trading':
        return (
          <div className="trading-view">
            <div className="chart-section">
              <AdvancedMarketChart 
                symbol={selectedSymbol}
                onSymbolChange={setSelectedSymbol}
              />
            </div>
            <div className="strategy-section">
              <StrategyBuilder 
                selectedSymbol={selectedSymbol}
                onSymbolChange={setSelectedSymbol}
              />
            </div>
          </div>
        );
      
      case 'learning':
        return (
          <div className="learning-view">
            <EnhancedEducationalPanel 
              currentStrategy={null}
              selectedSymbol={selectedSymbol}
            />
          </div>
        );
      
      case 'analysis':
        return (
          <div className="analysis-view">
            <div className="risk-section">
              <RiskDashboard 
                portfolio={portfolio}
                marketData={marketData}
                cashBalance={portfolio.cashBalance}
              />
            </div>
            <div className="market-section">
              <MarketDataPanel symbols={['MSTY', 'PLTY', 'TSLY', 'SPY']} />
            </div>
          </div>
        );
      
      case 'portfolio':
        return (
          <div className="portfolio-view">
            <div className="portfolio-details">
              <PortfolioSummary />
            </div>
            <div className="performance-section">
              <RealTimePLMonitor 
                updateFrequency={5000}
                showDetailedMetrics={true}
              />
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  const getLayoutClass = () => {
    return `dashboard-layout ${layoutMode} ${activeView}-view`;
  };

  return (
    <div className="trading-dashboard">
      {/* Top Navigation Bar */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1 className="app-title">Options Tutor</h1>
          <div className="market-status">
            <span className="status-dot active"></span>
            <span>Market Open</span>
          </div>
        </div>
        
        <nav className="main-navigation">
          <button 
            className={`nav-button ${activeView === 'trading' ? 'active' : ''}`}
            onClick={() => setActiveView('trading')}
          >
            <span className="nav-icon">📈</span>
            Trading
          </button>
          <button 
            className={`nav-button ${activeView === 'portfolio' ? 'active' : ''}`}
            onClick={() => setActiveView('portfolio')}
          >
            <span className="nav-icon">💼</span>
            Portfolio
          </button>
          <button 
            className={`nav-button ${activeView === 'analysis' ? 'active' : ''}`}
            onClick={() => setActiveView('analysis')}
          >
            <span className="nav-icon">📊</span>
            Analysis
          </button>
          <button 
            className={`nav-button ${activeView === 'learning' ? 'active' : ''}`}
            onClick={() => setActiveView('learning')}
          >
            <span className="nav-icon">🎓</span>
            Learning
          </button>
        </nav>

        <div className="header-right">
          <div className="quick-stats">
            <div className="stat">
              <label>Portfolio</label>
              <span className={`value ${portfolio.unrealizedPL >= 0 ? 'positive' : 'negative'}`}>
                ${(portfolio.cashBalance + portfolio.unrealizedPL).toLocaleString()}
              </span>
            </div>
            <div className="stat">
              <label>P&L</label>
              <span className={`value ${portfolio.unrealizedPL >= 0 ? 'positive' : 'negative'}`}>
                {portfolio.unrealizedPL >= 0 ? '+' : ''}${portfolio.unrealizedPL.toFixed(2)}
              </span>
            </div>
          </div>
          
          <div className="layout-controls">
            <button 
              className={`layout-btn ${layoutMode === 'standard' ? 'active' : ''}`}
              onClick={() => setLayoutMode('standard')}
              title="Standard Layout"
            >
              ⊞
            </button>
            <button 
              className={`layout-btn ${layoutMode === 'focus' ? 'active' : ''}`}
              onClick={() => setLayoutMode('focus')}
              title="Focus Mode"
            >
              ⊡
            </button>
            <button 
              className={`layout-btn ${layoutMode === 'compact' ? 'active' : ''}`}
              onClick={() => setLayoutMode('compact')}
              title="Compact View"
            >
              ⊟
            </button>
          </div>

          <button 
            className={`help-button ${showEducationalPanel ? 'active' : ''}`}
            onClick={() => setShowEducationalPanel(!showEducationalPanel)}
            title="Toggle Help"
          >
            ?
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={getLayoutClass()}>
        {/* Sidebar - Always visible in standard mode */}
        {layoutMode === 'standard' && (
          <aside className="dashboard-sidebar">
            <div className="sidebar-section">
              <h3>Quick Portfolio</h3>
              <div className="mini-portfolio">
                <div className="portfolio-metric">
                  <label>Cash</label>
                  <span>${portfolio.cashBalance.toLocaleString()}</span>
                </div>
                <div className="portfolio-metric">
                  <label>Positions</label>
                  <span>{portfolio.positions.length}</span>
                </div>
                <div className="portfolio-metric">
                  <label>Margin</label>
                  <span className={portfolio.marginUsage > 80 ? 'warning' : ''}>
                    {portfolio.marginUsage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="sidebar-section">
              <h3>Watchlist</h3>
              <div className="watchlist">
                {['MSTY', 'PLTY', 'TSLY', 'SPY'].map(symbol => (
                  <div 
                    key={symbol}
                    className={`watchlist-item ${selectedSymbol === symbol ? 'selected' : ''}`}
                    onClick={() => setSelectedSymbol(symbol)}
                  >
                    <span className="symbol">{symbol}</span>
                    <span className="price">$45.23</span>
                    <span className="change positive">+0.45</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="sidebar-section">
              <h3>Recent Strategies</h3>
              <div className="recent-strategies">
                <div className="strategy-item">
                  <span className="strategy-name">MSTY Covered Call</span>
                  <span className="strategy-pl positive">+$125</span>
                </div>
                <div className="strategy-item">
                  <span className="strategy-name">PLTY Cash Put</span>
                  <span className="strategy-pl negative">-$45</span>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Main Content */}
        <div className="dashboard-content">
          {renderMainContent()}
        </div>

        {/* Educational Panel - Toggleable */}
        {showEducationalPanel && (
          <aside className="educational-sidebar">
            <div className="educational-header">
              <h3>Learning Assistant</h3>
              <button 
                className="close-btn"
                onClick={() => setShowEducationalPanel(false)}
              >
                ×
              </button>
            </div>
            <EnhancedEducationalPanel 
              currentStrategy={null}
              selectedSymbol={selectedSymbol}
              compact={true}
            />
          </aside>
        )}
      </main>

      {/* Status Bar */}
      <footer className="dashboard-footer">
        <div className="footer-left">
          <span className="connection-status">
            <span className="status-dot connected"></span>
            Market Data: Connected
          </span>
          <span className="update-info">
            Last Update: {new Date().toLocaleTimeString()}
          </span>
        </div>
        
        <div className="footer-center">
          <span className="selected-symbol">
            Selected: {selectedSymbol}
          </span>
        </div>
        
        <div className="footer-right">
          <span className="performance-info">
            Updates/sec: {portfolio.updatesPerSecond}
          </span>
          <span className="memory-info">
            Positions: {portfolio.positions.length}
          </span>
        </div>
      </footer>
    </div>
  );
};

export default TradingDashboard;