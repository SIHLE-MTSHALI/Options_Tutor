import React, { useState, useEffect, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { useAppSelector } from '../redux/hooks';
import { RealTimeMarketDataService } from '../services/RealTimeMarketDataService';
import './AdvancedMarketChart.scss';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AdvancedMarketChartProps {
  symbol: string;
  onSymbolChange: (symbol: string) => void;
}

type ChartType = 'price' | 'payoff' | 'greeks' | 'volatility';
type TimeFrame = '1D' | '1W' | '1M' | '3M' | '1Y';

interface PriceData {
  timestamp: number;
  price: number;
  volume: number;
}

interface PayoffData {
  underlyingPrice: number;
  profit: number;
}

const AdvancedMarketChart: React.FC<AdvancedMarketChartProps> = ({ 
  symbol, 
  onSymbolChange 
}) => {
  const [chartType, setChartType] = useState<ChartType>('price');
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('1D');
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [payoffData, setPayoffData] = useState<PayoffData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const positions = useAppSelector(state => state.portfolio.positions);
  const marketDataService = RealTimeMarketDataService.getInstance();
  const updateInterval = useRef<NodeJS.Timeout | null>(null);

  // Generate mock historical data for demonstration
  const generateMockPriceData = (symbol: string, timeFrame: TimeFrame): PriceData[] => {
    const now = Date.now();
    const intervals = {
      '1D': { count: 24, interval: 60 * 60 * 1000 }, // Hourly for 1 day
      '1W': { count: 7, interval: 24 * 60 * 60 * 1000 }, // Daily for 1 week
      '1M': { count: 30, interval: 24 * 60 * 60 * 1000 }, // Daily for 1 month
      '3M': { count: 90, interval: 24 * 60 * 60 * 1000 }, // Daily for 3 months
      '1Y': { count: 52, interval: 7 * 24 * 60 * 60 * 1000 } // Weekly for 1 year
    };

    const { count, interval } = intervals[timeFrame];
    const basePrice = getBasePriceForSymbol(symbol);
    const data: PriceData[] = [];

    for (let i = count; i >= 0; i--) {
      const timestamp = now - (i * interval);
      const volatility = 0.02; // 2% daily volatility
      const randomChange = (Math.random() - 0.5) * 2 * volatility;
      const price = basePrice * (1 + randomChange * (i / count)); // Trending component
      const volume = Math.floor(Math.random() * 1000000) + 100000;

      data.push({
        timestamp,
        price: Math.max(price, basePrice * 0.5), // Prevent negative prices
        volume
      });
    }

    return data;
  };

  const getBasePriceForSymbol = (symbol: string): number => {
    const basePrices: Record<string, number> = {
      'MSTY': 45,
      'PLTY': 28,
      'TSLY': 35,
      'SPY': 400,
      'QQQ': 350,
      'AAPL': 150,
      'TSLA': 200
    };
    return basePrices[symbol] || 100;
  };

  // Calculate payoff diagram for current positions
  const calculatePayoffDiagram = (): PayoffData[] => {
    const symbolPositions = positions.filter(p => p.symbol === symbol);
    if (symbolPositions.length === 0) return [];

    const basePrice = currentPrice || getBasePriceForSymbol(symbol);
    const priceRange = basePrice * 0.4; // ±40% price range
    const steps = 50;
    const stepSize = (priceRange * 2) / steps;
    const payoffData: PayoffData[] = [];

    for (let i = 0; i <= steps; i++) {
      const underlyingPrice = basePrice - priceRange + (i * stepSize);
      let totalProfit = 0;

      symbolPositions.forEach(position => {
        let positionProfit = 0;

        if (position.type === 'stock') {
          // Stock position
          positionProfit = (underlyingPrice - position.purchasePrice) * position.quantity;
        } else if (position.type === 'call') {
          // Call option
          const intrinsicValue = Math.max(0, underlyingPrice - (position.strike || 0));
          if (position.positionType === 'long') {
            positionProfit = (intrinsicValue - position.purchasePrice) * Math.abs(position.quantity) * 100;
          } else {
            positionProfit = (position.purchasePrice - intrinsicValue) * Math.abs(position.quantity) * 100;
          }
        } else if (position.type === 'put') {
          // Put option
          const intrinsicValue = Math.max(0, (position.strike || 0) - underlyingPrice);
          if (position.positionType === 'long') {
            positionProfit = (intrinsicValue - position.purchasePrice) * Math.abs(position.quantity) * 100;
          } else {
            positionProfit = (position.purchasePrice - intrinsicValue) * Math.abs(position.quantity) * 100;
          }
        }

        totalProfit += positionProfit;
      });

      payoffData.push({
        underlyingPrice,
        profit: totalProfit
      });
    }

    return payoffData;
  };

  // Update current price
  useEffect(() => {
    const updatePrice = async () => {
      try {
        setIsLoading(true);
        const quote = await marketDataService.getStockQuote(symbol);
        setCurrentPrice(quote.price);
        setError(null);
      } catch (err) {
        setError(`Failed to fetch price for ${symbol}`);
        setCurrentPrice(getBasePriceForSymbol(symbol));
      } finally {
        setIsLoading(false);
      }
    };

    updatePrice();

    // Set up real-time updates
    updateInterval.current = setInterval(updatePrice, 10000); // Update every 10 seconds

    return () => {
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
    };
  }, [symbol]);

  // Update chart data when symbol or timeframe changes
  useEffect(() => {
    setPriceData(generateMockPriceData(symbol, timeFrame));
  }, [symbol, timeFrame]);

  // Update payoff data when positions change
  useEffect(() => {
    setPayoffData(calculatePayoffDiagram());
  }, [positions, symbol, currentPrice]);

  const getPriceChartData = () => {
    return {
      labels: priceData.map(d => new Date(d.timestamp).toLocaleTimeString()),
      datasets: [
        {
          label: `${symbol} Price`,
          data: priceData.map(d => d.price),
          borderColor: '#3a86ff',
          backgroundColor: 'rgba(58, 134, 255, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 4
        }
      ]
    };
  };

  const getPayoffChartData = () => {
    return {
      labels: payoffData.map(d => d.underlyingPrice.toFixed(2)),
      datasets: [
        {
          label: 'Strategy P&L',
          data: payoffData.map(d => d.profit),
          borderColor: '#4ade80',
          backgroundColor: (context: any) => {
            const value = context.parsed.y;
            return value >= 0 ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)';
          },
          borderWidth: 2,
          fill: true,
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 4
        },
        {
          label: 'Break Even',
          data: payoffData.map(() => 0),
          borderColor: '#6b7280',
          borderWidth: 1,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#e0e0e0',
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(28, 35, 51, 0.9)',
        titleColor: '#e0e0e0',
        bodyColor: '#e0e0e0',
        borderColor: '#2a3245',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(42, 50, 69, 0.5)'
        },
        ticks: {
          color: '#e0e0e0',
          maxTicksLimit: 10
        }
      },
      y: {
        grid: {
          color: 'rgba(42, 50, 69, 0.5)'
        },
        ticks: {
          color: '#e0e0e0',
          callback: function(value: any) {
            return chartType === 'payoff' ? `$${value}` : `$${value.toFixed(2)}`;
          }
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  };

  const renderChart = () => {
    if (isLoading) {
      return (
        <div className="chart-loading">
          <div className="loading-spinner"></div>
          <span>Loading chart data...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="chart-error">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      );
    }

    switch (chartType) {
      case 'price':
        return <Line data={getPriceChartData()} options={chartOptions} />;
      case 'payoff':
        return <Line data={getPayoffChartData()} options={chartOptions} />;
      case 'greeks':
        return (
          <div className="chart-placeholder">
            <span>Greeks analysis coming soon</span>
          </div>
        );
      case 'volatility':
        return (
          <div className="chart-placeholder">
            <span>Volatility surface coming soon</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="advanced-market-chart">
      <div className="chart-header">
        <div className="symbol-selector">
          <select 
            value={symbol} 
            onChange={(e) => onSymbolChange(e.target.value)}
            className="symbol-select"
          >
            <option value="MSTY">MSTY - YieldMax TSLA Option Income Strategy ETF</option>
            <option value="PLTY">PLTY - YieldMax PLTR Option Income Strategy ETF</option>
            <option value="TSLY">TSLY - YieldMax TSLA Option Income Strategy ETF</option>
            <option value="SPY">SPY - SPDR S&P 500 ETF Trust</option>
            <option value="QQQ">QQQ - Invesco QQQ Trust</option>
            <option value="AAPL">AAPL - Apple Inc.</option>
            <option value="TSLA">TSLA - Tesla Inc.</option>
          </select>
          
          <div className="current-price">
            <span className="price-label">Current:</span>
            <span className="price-value">${currentPrice.toFixed(2)}</span>
          </div>
        </div>

        <div className="chart-controls">
          <div className="chart-type-buttons">
            <button 
              className={`chart-btn ${chartType === 'price' ? 'active' : ''}`}
              onClick={() => setChartType('price')}
            >
              Price
            </button>
            <button 
              className={`chart-btn ${chartType === 'payoff' ? 'active' : ''}`}
              onClick={() => setChartType('payoff')}
              disabled={positions.filter(p => p.symbol === symbol).length === 0}
            >
              Payoff
            </button>
            <button 
              className={`chart-btn ${chartType === 'greeks' ? 'active' : ''}`}
              onClick={() => setChartType('greeks')}
            >
              Greeks
            </button>
            <button 
              className={`chart-btn ${chartType === 'volatility' ? 'active' : ''}`}
              onClick={() => setChartType('volatility')}
            >
              Volatility
            </button>
          </div>

          {chartType === 'price' && (
            <div className="timeframe-buttons">
              {(['1D', '1W', '1M', '3M', '1Y'] as TimeFrame[]).map(tf => (
                <button
                  key={tf}
                  className={`time-btn ${timeFrame === tf ? 'active' : ''}`}
                  onClick={() => setTimeFrame(tf)}
                >
                  {tf}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="chart-container">
        {renderChart()}
      </div>

      <div className="chart-footer">
        <div className="chart-info">
          {chartType === 'price' && (
            <>
              <span>Timeframe: {timeFrame}</span>
              <span>Data Points: {priceData.length}</span>
            </>
          )}
          {chartType === 'payoff' && (
            <>
              <span>Positions: {positions.filter(p => p.symbol === symbol).length}</span>
              <span>Current P&L: ${positions.filter(p => p.symbol === symbol).reduce((sum, p) => sum + p.unrealizedPL, 0).toFixed(2)}</span>
            </>
          )}
        </div>
        
        <div className="chart-actions">
          <button className="action-btn" title="Export Chart">
            📊
          </button>
          <button className="action-btn" title="Full Screen">
            ⛶
          </button>
          <button className="action-btn" title="Settings">
            ⚙️
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedMarketChart;