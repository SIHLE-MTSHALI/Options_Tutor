import React, { useState, useEffect } from 'react';
import { RealTimeMarketDataService } from '../services/RealTimeMarketDataService';
import './MarketDataPanel.scss';

interface MarketDataPanelProps {
  symbols: string[];
}

interface QuoteData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
  source: string;
}

interface MarketStatus {
  isOpen: boolean;
  nextOpen: string;
  nextClose: string;
}

const MarketDataPanel: React.FC<MarketDataPanelProps> = ({ symbols }) => {
  const [quotes, setQuotes] = useState<Map<string, QuoteData>>(new Map());
  const [marketStatus, setMarketStatus] = useState<MarketStatus>({
    isOpen: true,
    nextOpen: '',
    nextClose: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string>(symbols[0] || '');

  const marketDataService = RealTimeMarketDataService.getInstance();

  // Update quotes
  const updateQuotes = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const quotesMap = await marketDataService.getMultipleQuotes(symbols);
      setQuotes(quotesMap);
      setLastUpdate(new Date());
    } catch (err) {
      setError(`Failed to fetch market data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Check market status
  const checkMarketStatus = () => {
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
    
    // Market hours: 9:30 AM - 4:00 PM ET (simplified)
    const marketOpen = 930;
    const marketClose = 1600;
    
    const isOpen = isWeekday && currentTime >= marketOpen && currentTime < marketClose;
    
    setMarketStatus({
      isOpen,
      nextOpen: isOpen ? '' : 'Tomorrow 9:30 AM ET',
      nextClose: isOpen ? 'Today 4:00 PM ET' : ''
    });
  };

  // Initial load and periodic updates
  useEffect(() => {
    updateQuotes();
    checkMarketStatus();

    const interval = setInterval(() => {
      updateQuotes();
      checkMarketStatus();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [symbols]);

  const formatPrice = (price: number): string => {
    return `$${price.toFixed(2)}`;
  };

  const formatChange = (change: number, changePercent: number): string => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`;
  };

  const getChangeClass = (change: number): string => {
    if (change > 0) return 'positive';
    if (change < 0) return 'negative';
    return 'neutral';
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toString();
  };

  const getSelectedQuote = (): QuoteData | null => {
    return quotes.get(selectedSymbol) || null;
  };

  return (
    <div className="market-data-panel">
      <div className="panel-header">
        <div className="header-left">
          <h3>Market Data</h3>
          <div className={`market-status ${marketStatus.isOpen ? 'open' : 'closed'}`}>
            <span className="status-dot"></span>
            <span className="status-text">
              {marketStatus.isOpen ? 'Market Open' : 'Market Closed'}
            </span>
          </div>
        </div>
        
        <div className="header-right">
          {lastUpdate && (
            <span className="last-update">
              Updated: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <button 
            className="refresh-btn"
            onClick={updateQuotes}
            disabled={isLoading}
          >
            {isLoading ? '⟳' : '↻'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="quotes-container">
        <div className="quotes-list">
          {symbols.map(symbol => {
            const quote = quotes.get(symbol);
            return (
              <div
                key={symbol}
                className={`quote-item ${selectedSymbol === symbol ? 'selected' : ''} ${!quote ? 'loading' : ''}`}
                onClick={() => setSelectedSymbol(symbol)}
              >
                <div className="quote-header">
                  <span className="symbol">{symbol}</span>
                  {quote && (
                    <span className="source">{quote.source}</span>
                  )}
                </div>
                
                {quote ? (
                  <>
                    <div className="price-info">
                      <span className="price">{formatPrice(quote.price)}</span>
                      <span className={`change ${getChangeClass(quote.change)}`}>
                        {formatChange(quote.change, quote.changePercent)}
                      </span>
                    </div>
                    <div className="volume-info">
                      <span className="volume">Vol: {formatVolume(quote.volume)}</span>
                    </div>
                  </>
                ) : (
                  <div className="loading-placeholder">
                    <div className="loading-spinner"></div>
                    <span>Loading...</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Detailed view for selected symbol */}
        {selectedSymbol && getSelectedQuote() && (
          <div className="quote-details">
            <h4>{selectedSymbol} Details</h4>
            <div className="details-grid">
              <div className="detail-item">
                <label>Current Price</label>
                <span className="value">{formatPrice(getSelectedQuote()!.price)}</span>
              </div>
              <div className="detail-item">
                <label>Change</label>
                <span className={`value ${getChangeClass(getSelectedQuote()!.change)}`}>
                  {formatChange(getSelectedQuote()!.change, getSelectedQuote()!.changePercent)}
                </span>
              </div>
              <div className="detail-item">
                <label>Volume</label>
                <span className="value">{getSelectedQuote()!.volume.toLocaleString()}</span>
              </div>
              <div className="detail-item">
                <label>Data Source</label>
                <span className="value">{getSelectedQuote()!.source}</span>
              </div>
              <div className="detail-item">
                <label>Last Updated</label>
                <span className="value">
                  {new Date(getSelectedQuote()!.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>

            {/* Quick actions */}
            <div className="quick-actions">
              <button className="action-btn">
                📈 View Chart
              </button>
              <button className="action-btn">
                📊 Options Chain
              </button>
              <button className="action-btn">
                ⭐ Add to Watchlist
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Market hours info */}
      <div className="market-info">
        <div className="info-section">
          <h5>Market Hours</h5>
          <div className="hours-info">
            <div className="hours-item">
              <span className="label">Regular Hours:</span>
              <span className="value">9:30 AM - 4:00 PM ET</span>
            </div>
            <div className="hours-item">
              <span className="label">Pre-Market:</span>
              <span className="value">4:00 AM - 9:30 AM ET</span>
            </div>
            <div className="hours-item">
              <span className="label">After Hours:</span>
              <span className="value">4:00 PM - 8:00 PM ET</span>
            </div>
          </div>
        </div>

        <div className="info-section">
          <h5>Data Providers</h5>
          <div className="providers-info">
            <div className="provider-item">
              <span className="provider-name">Alpha Vantage</span>
              <span className="provider-status connected">Connected</span>
            </div>
            <div className="provider-item">
              <span className="provider-name">IEX Cloud</span>
              <span className="provider-status disconnected">Standby</span>
            </div>
            <div className="provider-item">
              <span className="provider-name">Mock Data</span>
              <span className="provider-status connected">Fallback</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketDataPanel;