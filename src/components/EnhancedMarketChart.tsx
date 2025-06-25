import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Line, Bar, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
  ChartOptions,
  ChartData,
  TooltipItem
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { useAppSelector } from '../redux/hooks';
import { OptimizedRealTimeService } from '../services/OptimizedRealTimeService';
import { Position } from '../redux/types';
import './EnhancedMarketChart.scss';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale
);

interface EnhancedMarketChartProps {
  symbol: string;
  onSymbolChange: (symbol: string) => void;
  height?: number;
  showVolume?: boolean;
  showIndicators?: boolean;
  realTimeUpdates?: boolean;
}

type ChartType = 'price' | 'payoff' | 'greeks' | 'volatility' | 'volume' | 'heatmap';
type TimeFrame = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';
type Indicator = 'SMA' | 'EMA' | 'RSI' | 'MACD' | 'BB' | 'VWAP';

interface PriceData {
  timestamp: number;
  price: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  close: number;
}

interface IndicatorData {
  timestamp: number;
  value: number;
  signal?: number;
  histogram?: number;
}

interface GreeksData {
  timestamp: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

const EnhancedMarketChart: React.FC<EnhancedMarketChartProps> = ({
  symbol,
  onSymbolChange,
  height = 400,
  showVolume = true,
  showIndicators = true,
  realTimeUpdates = true
}) => {
  const [chartType, setChartType] = useState<ChartType>('price');
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('1D');
  const [selectedIndicators, setSelectedIndicators] = useState<Indicator[]>(['SMA']);
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [indicatorData, setIndicatorData] = useState<Map<Indicator, IndicatorData[]>>(new Map());
  const [greeksData, setGreeksData] = useState<GreeksData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [priceChangePercent, setPriceChangePercent] = useState<number>(0);
  
  const chartRef = useRef<ChartJS<'line'>>(null);
  const realTimeService = useRef(OptimizedRealTimeService.getInstance());
  
  const portfolio = useAppSelector(state => state.portfolio);
  const positions = useAppSelector(state => state.portfolio.positions);
  const selectedPosition = positions.find(p => p.symbol === symbol);

  // Memoized chart options for performance
  const chartOptions = useMemo((): ChartOptions<'line'> => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      title: {
        display: true,
        text: `${symbol} - ${chartType.toUpperCase()} Chart (${timeFrame})`,
        font: {
          size: 16,
          weight: 'bold'
        },
        color: '#e0e0e0'
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#4ade80',
        borderWidth: 1,
        callbacks: {
          title: (context) => {
            const date = new Date(context[0].parsed.x);
            return date.toLocaleString();
          },
          label: (context: TooltipItem<'line'>) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            
            if (chartType === 'price') {
              return `${label}: $${value.toFixed(2)}`;
            } else if (chartType === 'volume') {
              return `${label}: ${value.toLocaleString()}`;
            } else if (chartType === 'greeks') {
              return `${label}: ${value.toFixed(4)}`;
            }
            return `${label}: ${value.toFixed(2)}`;
          },
          afterBody: (context) => {
            if (chartType === 'price' && selectedPosition) {
              const currentPrice = context[0].parsed.y;
              const pl = (currentPrice - selectedPosition.purchasePrice) * selectedPosition.quantity;
              const plPercent = ((currentPrice - selectedPosition.purchasePrice) / selectedPosition.purchasePrice) * 100;
              return [
                `Position P&L: $${pl.toFixed(2)}`,
                `Position P&L%: ${plPercent.toFixed(2)}%`
              ];
            }
            return [];
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          displayFormats: {
            minute: 'HH:mm',
            hour: 'HH:mm',
            day: 'MMM dd',
            week: 'MMM dd',
            month: 'MMM yyyy'
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: '#e0e0e0'
        }
      },
      y: {
        position: 'left',
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: '#e0e0e0',
          callback: function(value) {
            if (chartType === 'price') {
              return '$' + Number(value).toFixed(2);
            } else if (chartType === 'volume') {
              return Number(value).toLocaleString();
            }
            return Number(value).toFixed(2);
          }
        }
      },
      ...(showVolume && chartType === 'price' ? {
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            color: '#e0e0e0',
            callback: function(value) {
              return Number(value).toLocaleString();
            }
          }
        }
      } : {})
    },
    elements: {
      point: {
        radius: chartType === 'price' ? 0 : 3,
        hoverRadius: 6
      },
      line: {
        tension: 0.1,
        borderWidth: 2
      }
    },
    animation: {
      duration: realTimeUpdates ? 300 : 1000,
      easing: 'easeInOutQuart'
    }
  }), [symbol, chartType, timeFrame, showVolume, selectedPosition, realTimeUpdates]);

  // Generate chart data based on current chart type
  const chartData = useMemo((): ChartData<'line'> => {
    const datasets: any[] = [];

    switch (chartType) {
      case 'price':
        datasets.push({
          label: 'Price',
          data: priceData.map(d => ({ x: d.timestamp, y: d.close })),
          borderColor: '#4ade80',
          backgroundColor: 'rgba(74, 222, 128, 0.1)',
          fill: true,
          yAxisID: 'y'
        });

        if (showVolume) {
          datasets.push({
            label: 'Volume',
            data: priceData.map(d => ({ x: d.timestamp, y: d.volume })),
            borderColor: '#fbbf24',
            backgroundColor: 'rgba(251, 191, 36, 0.3)',
            type: 'bar',
            yAxisID: 'y1'
          });
        }

        // Add position entry point
        if (selectedPosition) {
          datasets.push({
            label: 'Entry Price',
            data: priceData.map(d => ({ x: d.timestamp, y: selectedPosition.purchasePrice })),
            borderColor: '#ef4444',
            backgroundColor: 'transparent',
            borderDash: [5, 5],
            pointRadius: 0,
            yAxisID: 'y'
          });
        }

        // Add indicators
        selectedIndicators.forEach(indicator => {
          const data = indicatorData.get(indicator);
          if (data) {
            datasets.push({
              label: indicator,
              data: data.map(d => ({ x: d.timestamp, y: d.value })),
              borderColor: getIndicatorColor(indicator),
              backgroundColor: 'transparent',
              pointRadius: 0,
              yAxisID: 'y'
            });
          }
        });
        break;

      case 'payoff':
        if (selectedPosition) {
          const payoffData = generatePayoffDiagram(selectedPosition);
          datasets.push({
            label: 'Payoff',
            data: payoffData,
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            fill: true
          });
        }
        break;

      case 'greeks':
        ['delta', 'gamma', 'theta', 'vega'].forEach(greek => {
          datasets.push({
            label: greek.charAt(0).toUpperCase() + greek.slice(1),
            data: greeksData.map(d => ({ 
              x: d.timestamp, 
              y: d[greek as keyof GreeksData] as number 
            })),
            borderColor: getGreekColor(greek),
            backgroundColor: 'transparent',
            pointRadius: 0
          });
        });
        break;

      case 'volatility':
        const volatilityData = calculateVolatility(priceData);
        datasets.push({
          label: 'Implied Volatility',
          data: volatilityData.map((v, i) => ({ 
            x: priceData[i]?.timestamp || Date.now(), 
            y: v 
          })),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          fill: true
        });
        break;

      case 'volume':
        datasets.push({
          label: 'Volume',
          data: priceData.map(d => ({ x: d.timestamp, y: d.volume })),
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.3)',
          type: 'bar'
        });
        break;
    }

    return { datasets };
  }, [chartType, priceData, indicatorData, greeksData, selectedPosition, selectedIndicators, showVolume]);

  // Real-time price updates
  useEffect(() => {
    if (!realTimeUpdates) return;

    const unsubscribe = realTimeService.current.subscribeToSymbol(
      symbol,
      (update) => {
        setCurrentPrice(update.price);
        
        if (update.change !== undefined) {
          setPriceChange(update.change);
        }
        
        if (update.changePercent !== undefined) {
          setPriceChangePercent(update.changePercent);
        }

        // Update chart data with new price
        setPriceData(prev => {
          const newData = [...prev];
          const lastPoint = newData[newData.length - 1];
          
          if (lastPoint && Date.now() - lastPoint.timestamp < 60000) {
            // Update last point if within 1 minute
            lastPoint.close = update.price;
            lastPoint.timestamp = update.timestamp;
          } else {
            // Add new point
            newData.push({
              timestamp: update.timestamp,
              price: update.price,
              close: update.price,
              open: lastPoint?.close || update.price,
              high: Math.max(lastPoint?.close || update.price, update.price),
              low: Math.min(lastPoint?.close || update.price, update.price),
              volume: update.volume || 0
            });
          }

          // Keep only last 1000 points for performance
          return newData.slice(-1000);
        });
      },
      { throttleMs: 1000, minChangeThreshold: 0.01 }
    );

    return unsubscribe;
  }, [symbol, realTimeUpdates]);

  // Load historical data
  useEffect(() => {
    loadHistoricalData();
  }, [symbol, timeFrame]);

  // Calculate indicators when price data changes
  useEffect(() => {
    if (priceData.length > 0) {
      calculateIndicators();
    }
  }, [priceData, selectedIndicators]);

  const loadHistoricalData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate loading historical data
      const mockData = generateMockHistoricalData(symbol, timeFrame);
      setPriceData(mockData);
      
      if (chartType === 'greeks' && selectedPosition?.type !== 'stock') {
        const mockGreeks = generateMockGreeksData(mockData);
        setGreeksData(mockGreeks);
      }
    } catch (err) {
      setError('Failed to load historical data');
      console.error('Error loading historical data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, timeFrame, chartType, selectedPosition]);

  const calculateIndicators = useCallback(() => {
    const newIndicatorData = new Map<Indicator, IndicatorData[]>();

    selectedIndicators.forEach(indicator => {
      let data: IndicatorData[] = [];

      switch (indicator) {
        case 'SMA':
          data = calculateSMA(priceData, 20);
          break;
        case 'EMA':
          data = calculateEMA(priceData, 20);
          break;
        case 'RSI':
          data = calculateRSI(priceData, 14);
          break;
        case 'MACD':
          data = calculateMACD(priceData);
          break;
        case 'BB':
          data = calculateBollingerBands(priceData, 20, 2);
          break;
        case 'VWAP':
          data = calculateVWAP(priceData);
          break;
      }

      newIndicatorData.set(indicator, data);
    });

    setIndicatorData(newIndicatorData);
  }, [priceData, selectedIndicators]);

  const handleIndicatorToggle = (indicator: Indicator) => {
    setSelectedIndicators(prev => 
      prev.includes(indicator) 
        ? prev.filter(i => i !== indicator)
        : [...prev, indicator]
    );
  };

  const handleExportChart = () => {
    if (chartRef.current) {
      const canvas = chartRef.current.canvas;
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${symbol}_${chartType}_${timeFrame}.png`;
      link.href = url;
      link.click();
    }
  };

  const handleFullscreen = () => {
    const chartContainer = chartRef.current?.canvas.parentElement;
    if (chartContainer) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        chartContainer.requestFullscreen();
      }
    }
  };

  return (
    <div className="enhanced-market-chart">
      {/* Chart Header */}
      <div className="chart-header">
        <div className="symbol-info">
          <h3 className="symbol">{symbol}</h3>
          {currentPrice && (
            <div className="price-info">
              <span className="current-price">${currentPrice.toFixed(2)}</span>
              <span className={`price-change ${priceChange >= 0 ? 'positive' : 'negative'}`}>
                {priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
              </span>
            </div>
          )}
        </div>

        <div className="chart-controls">
          {/* Time Frame Selector */}
          <div className="time-frame-selector">
            {(['1D', '1W', '1M', '3M', '1Y', 'ALL'] as TimeFrame[]).map(tf => (
              <button
                key={tf}
                className={`time-frame-btn ${timeFrame === tf ? 'active' : ''}`}
                onClick={() => setTimeFrame(tf)}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Chart Type Selector */}
          <div className="chart-type-selector">
            <select 
              value={chartType} 
              onChange={(e) => setChartType(e.target.value as ChartType)}
              className="chart-type-select"
            >
              <option value="price">Price</option>
              <option value="payoff">Payoff Diagram</option>
              <option value="greeks">Greeks</option>
              <option value="volatility">Volatility</option>
              <option value="volume">Volume</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button onClick={handleExportChart} className="export-btn" title="Export Chart">
              📊
            </button>
            <button onClick={handleFullscreen} className="fullscreen-btn" title="Fullscreen">
              ⛶
            </button>
          </div>
        </div>
      </div>

      {/* Indicators Panel */}
      {showIndicators && chartType === 'price' && (
        <div className="indicators-panel">
          <span className="indicators-label">Indicators:</span>
          {(['SMA', 'EMA', 'RSI', 'MACD', 'BB', 'VWAP'] as Indicator[]).map(indicator => (
            <label key={indicator} className="indicator-checkbox">
              <input
                type="checkbox"
                checked={selectedIndicators.includes(indicator)}
                onChange={() => handleIndicatorToggle(indicator)}
              />
              <span>{indicator}</span>
            </label>
          ))}
        </div>
      )}

      {/* Chart Container */}
      <div className="chart-container" style={{ height: `${height}px` }}>
        {isLoading ? (
          <div className="loading-spinner">Loading chart data...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : (
          <Line
            ref={chartRef}
            data={chartData}
            options={chartOptions}
          />
        )}
      </div>

      {/* Position Info */}
      {selectedPosition && (
        <div className="position-info">
          <div className="position-details">
            <span>Position: {selectedPosition.quantity} shares @ ${selectedPosition.purchasePrice.toFixed(2)}</span>
            {currentPrice && (
              <span className="position-pl">
                P&L: ${((currentPrice - selectedPosition.purchasePrice) * selectedPosition.quantity).toFixed(2)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper functions for calculations
function generateMockHistoricalData(symbol: string, timeFrame: TimeFrame): PriceData[] {
  const now = Date.now();
  const intervals = {
    '1D': { count: 390, interval: 60000 }, // 1 minute intervals
    '1W': { count: 168, interval: 3600000 }, // 1 hour intervals
    '1M': { count: 30, interval: 86400000 }, // 1 day intervals
    '3M': { count: 90, interval: 86400000 },
    '1Y': { count: 365, interval: 86400000 },
    'ALL': { count: 1000, interval: 86400000 }
  };

  const config = intervals[timeFrame];
  const data: PriceData[] = [];
  let price = 100 + Math.random() * 50; // Base price

  for (let i = config.count; i >= 0; i--) {
    const timestamp = now - (i * config.interval);
    const change = (Math.random() - 0.5) * 2; // Random walk
    price = Math.max(price + change, 1);
    
    const high = price + Math.random() * 2;
    const low = price - Math.random() * 2;
    const volume = Math.floor(Math.random() * 1000000);

    data.push({
      timestamp,
      price,
      open: price,
      high,
      low,
      close: price,
      volume
    });
  }

  return data;
}

function generateMockGreeksData(priceData: PriceData[]): GreeksData[] {
  return priceData.map(d => ({
    timestamp: d.timestamp,
    delta: 0.5 + (Math.random() - 0.5) * 0.4,
    gamma: 0.1 + Math.random() * 0.05,
    theta: -0.05 - Math.random() * 0.03,
    vega: 0.2 + Math.random() * 0.1,
    rho: 0.01 + Math.random() * 0.005
  }));
}

function generatePayoffDiagram(position: Position): Array<{x: number, y: number}> {
  const currentPrice = position.currentPrice;
  const strike = position.strike || currentPrice;
  const premium = position.purchasePrice;
  
  const points: Array<{x: number, y: number}> = [];
  const range = currentPrice * 0.4; // ±40% range
  
  for (let price = currentPrice - range; price <= currentPrice + range; price += range / 50) {
    let payoff = 0;
    
    if (position.type === 'call') {
      if (position.positionType === 'long') {
        payoff = Math.max(0, price - strike) - premium;
      } else {
        payoff = premium - Math.max(0, price - strike);
      }
    } else if (position.type === 'put') {
      if (position.positionType === 'long') {
        payoff = Math.max(0, strike - price) - premium;
      } else {
        payoff = premium - Math.max(0, strike - price);
      }
    } else {
      // Stock
      payoff = (price - premium) * (position.positionType === 'long' ? 1 : -1);
    }
    
    points.push({ x: price, y: payoff * position.quantity });
  }
  
  return points;
}

// Technical indicator calculations
function calculateSMA(data: PriceData[], period: number): IndicatorData[] {
  const result: IndicatorData[] = [];
  
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((acc, d) => acc + d.close, 0);
    result.push({
      timestamp: data[i].timestamp,
      value: sum / period
    });
  }
  
  return result;
}

function calculateEMA(data: PriceData[], period: number): IndicatorData[] {
  const result: IndicatorData[] = [];
  const multiplier = 2 / (period + 1);
  
  if (data.length === 0) return result;
  
  // First EMA is SMA
  let ema = data.slice(0, period).reduce((acc, d) => acc + d.close, 0) / period;
  result.push({ timestamp: data[period - 1].timestamp, value: ema });
  
  for (let i = period; i < data.length; i++) {
    ema = (data[i].close * multiplier) + (ema * (1 - multiplier));
    result.push({ timestamp: data[i].timestamp, value: ema });
  }
  
  return result;
}

function calculateRSI(data: PriceData[], period: number): IndicatorData[] {
  const result: IndicatorData[] = [];
  
  if (data.length < period + 1) return result;
  
  for (let i = period; i < data.length; i++) {
    let gains = 0;
    let losses = 0;
    
    for (let j = i - period + 1; j <= i; j++) {
      const change = data[j].close - data[j - 1].close;
      if (change > 0) gains += change;
      else losses -= change;
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    result.push({
      timestamp: data[i].timestamp,
      value: rsi
    });
  }
  
  return result;
}

function calculateMACD(data: PriceData[]): IndicatorData[] {
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  const result: IndicatorData[] = [];
  
  const startIndex = Math.max(0, 26 - 12);
  
  for (let i = startIndex; i < Math.min(ema12.length, ema26.length); i++) {
    const macd = ema12[i + 12 - 1]?.value - ema26[i]?.value;
    if (!isNaN(macd)) {
      result.push({
        timestamp: ema26[i].timestamp,
        value: macd
      });
    }
  }
  
  return result;
}

function calculateBollingerBands(data: PriceData[], period: number, stdDev: number): IndicatorData[] {
  const sma = calculateSMA(data, period);
  const result: IndicatorData[] = [];
  
  for (let i = 0; i < sma.length; i++) {
    const dataIndex = i + period - 1;
    const prices = data.slice(dataIndex - period + 1, dataIndex + 1).map(d => d.close);
    const mean = sma[i].value;
    const variance = prices.reduce((acc, price) => acc + Math.pow(price - mean, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    result.push({
      timestamp: sma[i].timestamp,
      value: mean + (standardDeviation * stdDev) // Upper band
    });
  }
  
  return result;
}

function calculateVWAP(data: PriceData[]): IndicatorData[] {
  const result: IndicatorData[] = [];
  let cumulativeVolume = 0;
  let cumulativeVolumePrice = 0;
  
  for (const point of data) {
    const typicalPrice = (point.high + point.low + point.close) / 3;
    cumulativeVolumePrice += typicalPrice * point.volume;
    cumulativeVolume += point.volume;
    
    result.push({
      timestamp: point.timestamp,
      value: cumulativeVolume > 0 ? cumulativeVolumePrice / cumulativeVolume : typicalPrice
    });
  }
  
  return result;
}

function calculateVolatility(data: PriceData[]): number[] {
  const returns = [];
  
  for (let i = 1; i < data.length; i++) {
    const returnValue = Math.log(data[i].close / data[i - 1].close);
    returns.push(returnValue);
  }
  
  const volatilities = [];
  const window = 20;
  
  for (let i = window; i < returns.length; i++) {
    const windowReturns = returns.slice(i - window, i);
    const mean = windowReturns.reduce((a, b) => a + b, 0) / window;
    const variance = windowReturns.reduce((acc, ret) => acc + Math.pow(ret - mean, 2), 0) / window;
    const volatility = Math.sqrt(variance * 252) * 100; // Annualized volatility
    volatilities.push(volatility);
  }
  
  return volatilities;
}

function getIndicatorColor(indicator: Indicator): string {
  const colors = {
    SMA: '#ff6b6b',
    EMA: '#4ecdc4',
    RSI: '#45b7d1',
    MACD: '#f9ca24',
    BB: '#6c5ce7',
    VWAP: '#fd79a8'
  };
  return colors[indicator];
}

function getGreekColor(greek: string): string {
  const colors = {
    delta: '#4ade80',
    gamma: '#f59e0b',
    theta: '#ef4444',
    vega: '#8b5cf6',
    rho: '#06b6d4'
  };
  return colors[greek as keyof typeof colors] || '#e0e0e0';
}

export default EnhancedMarketChart;