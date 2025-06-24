# Options Tutor - API Reference

This document provides comprehensive API reference for the Options Tutor application, including internal APIs, service interfaces, and integration points.

## Table of Contents

1. [Redux Store API](#redux-store-api)
2. [Service Layer APIs](#service-layer-apis)
3. [Component APIs](#component-apis)
4. [IPC Communication](#ipc-communication)
5. [External Integrations](#external-integrations)
6. [Error Handling](#error-handling)
7. [Type Definitions](#type-definitions)
8. [Utilities](#utilities)

## Redux Store API

### Portfolio Slice

#### State Interface
```typescript
interface PortfolioState {
  cashBalance: number;
  positions: Position[];
  strategies: Strategy[];
  unrealizedPL: number;
  realizedPL: number;
  marginUsage: number;
  isPending: boolean;
  priceUpdateTimestamp: number;
  updatesPerSecond: number;
  lastSecondUpdates: number;
  maxUpdatesPerSecond: number;
  lastUpdateTime: number;
  strategyProfitLoss: Record<string, number>;
}
```

#### Actions
```typescript
// Position Management
addPosition(position: Position): void
removePosition(positionId: string): void
updatePosition(payload: { positionId: string; updates: Partial<Position> }): void
updatePositionPL(payload: { positionId: string; currentPrice: number; unrealizedPL: number }): void

// Portfolio Management
setCashBalance(amount: number): void
updatePortfolioPL(payload: { unrealizedPL: number; totalValue: number }): void
batchUpdatePositionPrices(updates: Array<{ symbol: string; price: number; timestamp: number }>): void

// Strategy Management
addStrategy(strategy: Strategy): void
removeStrategy(strategyId: string): void
updateStrategyPL(payload: { strategyId: string; profitLoss: number }): void

// Performance Tracking
updatePerformanceMetrics(metrics: PerformanceMetrics): void
```

#### Selectors
```typescript
// Basic Selectors
const selectCashBalance = (state: RootState) => state.portfolio.cashBalance;
const selectPositions = (state: RootState) => state.portfolio.positions;
const selectUnrealizedPL = (state: RootState) => state.portfolio.unrealizedPL;
const selectRealizedPL = (state: RootState) => state.portfolio.realizedPL;

// Computed Selectors
const selectTotalPortfolioValue = createSelector(
  [selectCashBalance, selectPositions],
  (cash, positions) => cash + positions.reduce((sum, pos) => sum + pos.currentPrice * pos.quantity, 0)
);

const selectPositionsBySymbol = createSelector(
  [selectPositions, (state: RootState, symbol: string) => symbol],
  (positions, symbol) => positions.filter(pos => pos.symbol === symbol)
);
```

### Trading Slice

#### State Interface
```typescript
interface TradingState {
  selectedLeg: TradeLeg | null;
  legs: TradeLeg[];
  orderType: OrderType;
  status: 'idle' | 'pending' | 'success' | 'error';
  error: string | null;
  selectedStrategy: StrategyType | null;
  showPayoffDiagram: boolean;
  showRiskGraph: boolean;
  tradeError: string | null;
  accountId: string;
}
```

#### Actions
```typescript
// Trade Management
setSelectedLeg(leg: TradeLeg | null): void
addTradeLeg(leg: TradeLeg): void
removeTradeLeg(legId: string): void
updateTradeLeg(payload: { legId: string; updates: Partial<TradeLeg> }): void
clearTradeLegs(): void

// Order Management
setOrderType(orderType: OrderType): void
setSelectedStrategy(strategy: StrategyType | null): void

// UI State
setShowPayoffDiagram(show: boolean): void
setShowRiskGraph(show: boolean): void

// Status Management
setTradingStatus(status: TradingState['status']): void
setTradeError(error: string | null): void
```

### Market Data Slice

#### State Interface
```typescript
interface MarketDataState {
  quotes: Record<string, Quote>;
  optionChains: Record<string, OptionChain>;
  historicalData: Record<string, HistoricalData[]>;
  isLoading: boolean;
  error: string | null;
  lastUpdate: number;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
}
```

#### Actions
```typescript
// Quote Management
updateQuote(payload: { symbol: string; quote: Quote }): void
updateMultipleQuotes(quotes: Record<string, Quote>): void

// Option Chain Management
setOptionChain(payload: { symbol: string; chain: OptionChain }): void

// Historical Data
setHistoricalData(payload: { symbol: string; data: HistoricalData[] }): void

// Connection Status
setConnectionStatus(status: MarketDataState['connectionStatus']): void
setLastUpdate(timestamp: number): void

// Loading States
setLoading(isLoading: boolean): void
setError(error: string | null): void
```

### Learning Slice

#### State Interface
```typescript
interface LearningState {
  xp: number;
  level: number;
  worlds: World[];
  journalEntries: JournalEntry[];
  riskProfile: 'conservative' | 'balanced' | 'aggressive';
  completedTutorials: string[];
  achievements: Achievement[];
}
```

#### Actions
```typescript
// XP and Level Management
addXP(amount: number): void
setLevel(level: number): void

// Tutorial Management
completeTutorial(tutorialId: string): void
resetTutorialProgress(): void

// Achievement Management
unlockAchievement(achievementId: string): void

// Journal Management
addJournalEntry(entry: string): void
removeJournalEntry(entryId: string): void

// Profile Management
setRiskProfile(profile: LearningState['riskProfile']): void

// Mission Management
completeMission(missionId: string): void
```

## Service Layer APIs

### TradeService

#### Core Methods
```typescript
class TradeService {
  /**
   * Execute a trade with validation and risk checks
   */
  static async executeTrade(trade: TradeRequest): Promise<TradeResult> {
    // Implementation details
  }

  /**
   * Validate trade parameters and requirements
   */
  static validateTrade(trade: TradeRequest): ValidationResult {
    // Implementation details
  }

  /**
   * Calculate margin requirements for a trade
   */
  static calculateMargin(trade: TradeRequest): MarginCalculation {
    // Implementation details
  }

  /**
   * Validate position modification parameters
   */
  static validatePositionModification(
    position: Position,
    stopLoss?: number,
    takeProfit?: number,
    currentPrice?: number
  ): string | null {
    // Implementation details
  }

  /**
   * Calculate strategy profit/loss scenarios
   */
  static calculateStrategyPL(
    strategy: StrategyType,
    parameters: StrategyParameters
  ): PLScenario[] {
    // Implementation details
  }
}
```

#### Type Definitions
```typescript
interface TradeRequest {
  symbol: string;
  type: 'stock' | 'call' | 'put';
  action: 'buy' | 'sell';
  quantity: number;
  price?: number;
  orderType: 'market' | 'limit' | 'stop';
  strategy?: StrategyType;
  legs?: TradeLeg[];
}

interface TradeResult {
  success: boolean;
  orderId?: string;
  executedPrice?: number;
  commission?: number;
  marginUsed?: number;
  newPositions?: Position[];
  error?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
```

### MarketDataService

#### Core Methods
```typescript
class MarketDataService {
  /**
   * Get real-time stock quote
   */
  async getStockQuote(symbol: string): Promise<Quote> {
    // Implementation details
  }

  /**
   * Get multiple stock quotes in batch
   */
  async getMultipleQuotes(symbols: string[]): Promise<Map<string, Quote>> {
    // Implementation details
  }

  /**
   * Get option chain for a symbol
   */
  async getOptionChain(symbol: string, expiry?: string): Promise<OptionChain> {
    // Implementation details
  }

  /**
   * Get historical price data
   */
  async getHistoricalData(
    symbol: string,
    period: TimePeriod,
    interval: TimeInterval
  ): Promise<HistoricalData[]> {
    // Implementation details
  }

  /**
   * Subscribe to real-time updates
   */
  subscribeToUpdates(
    symbols: string[],
    callback: (update: MarketUpdate) => void
  ): Subscription {
    // Implementation details
  }
}
```

#### Type Definitions
```typescript
interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  bid: number;
  ask: number;
  timestamp: number;
}

interface OptionChain {
  symbol: string;
  expiry: string;
  calls: OptionContract[];
  puts: OptionContract[];
}

interface OptionContract {
  strike: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}
```

### RiskService

#### Core Methods
```typescript
class RiskService {
  /**
   * Calculate portfolio risk metrics
   */
  static calculatePortfolioRisk(positions: Position[]): RiskMetrics {
    // Implementation details
  }

  /**
   * Calculate position risk metrics
   */
  static calculatePositionRisk(position: Position): PositionRisk {
    // Implementation details
  }

  /**
   * Assess early assignment probability
   */
  static assessEarlyAssignmentRisk(position: Position): AssignmentRisk {
    // Implementation details
  }

  /**
   * Calculate Value at Risk (VaR)
   */
  static calculateVaR(
    positions: Position[],
    confidence: number,
    timeHorizon: number
  ): VaRResult {
    // Implementation details
  }

  /**
   * Perform stress testing
   */
  static performStressTest(
    positions: Position[],
    scenarios: StressScenario[]
  ): StressTestResult[] {
    // Implementation details
  }
}
```

### OptimizedRealTimePLService

#### Core Methods
```typescript
class OptimizedRealTimePLService {
  /**
   * Start real-time P&L updates
   */
  start(updateFrequencyMs?: number): void {
    // Implementation details
  }

  /**
   * Stop real-time P&L updates
   */
  stop(): void {
    // Implementation details
  }

  /**
   * Subscribe to P&L updates with filtering
   */
  subscribe(
    callback: (update: PortfolioPLSummary) => void,
    options?: SubscriptionOptions
  ): () => void {
    // Implementation details
  }

  /**
   * Get current portfolio P&L summary
   */
  async getCurrentPortfolioPL(): Promise<PortfolioPLSummary> {
    // Implementation details
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    // Implementation details
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    // Implementation details
  }
}
```

## Component APIs

### InteractiveTutorialSystem

#### Props Interface
```typescript
interface InteractiveTutorialSystemProps {
  selectedTutorial?: string;
  onTutorialComplete?: (tutorialId: string) => void;
  compactMode?: boolean;
}
```

#### Tutorial Definition
```typescript
interface Tutorial {
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: 'basics' | 'strategies' | 'greeks' | 'risk-management' | 'advanced';
  estimatedTime: number;
  prerequisites: string[];
  steps: TutorialStep[];
  completionReward: number;
}

interface TutorialStep {
  id: string;
  title: string;
  content: string;
  type: 'explanation' | 'interaction' | 'quiz' | 'simulation' | 'video';
  component?: React.ComponentType<any>;
  validation?: (userInput: any) => ValidationResult;
  hints?: string[];
  xpReward?: number;
}
```

### EnhancedMarketChart

#### Props Interface
```typescript
interface EnhancedMarketChartProps {
  symbol: string;
  onSymbolChange: (symbol: string) => void;
  height?: number;
  showVolume?: boolean;
  showIndicators?: boolean;
  realTimeUpdates?: boolean;
}
```

#### Chart Configuration
```typescript
type ChartType = 'price' | 'payoff' | 'greeks' | 'volatility' | 'volume' | 'heatmap';
type TimeFrame = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';
type Indicator = 'SMA' | 'EMA' | 'RSI' | 'MACD' | 'BB' | 'VWAP';

interface ChartData {
  timestamp: number;
  price: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  close: number;
}
```

### LearningProgressTracker

#### Props Interface
```typescript
interface LearningProgressTrackerProps {
  compactMode?: boolean;
  showRecommendations?: boolean;
}
```

#### Progress Data
```typescript
interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'tutorial' | 'trading' | 'strategy' | 'risk' | 'milestone';
  xpRequired: number;
  unlocked: boolean;
  unlockedAt?: Date;
}

interface LearningPath {
  id: string;
  name: string;
  description: string;
  totalSteps: number;
  completedSteps: number;
  estimatedTime: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: string;
}
```

## IPC Communication

### Main Process to Renderer

#### Window Management
```typescript
interface WindowEvents {
  'window-maximize': () => void;
  'window-minimize': () => void;
  'window-close': () => void;
  'window-focus': () => void;
  'window-blur': () => void;
}
```

#### Application Events
```typescript
interface AppEvents {
  'app-version': (version: string) => void;
  'app-update-available': (updateInfo: UpdateInfo) => void;
  'app-update-downloaded': () => void;
  'app-restart-required': () => void;
}
```

#### Market Data Events
```typescript
interface MarketDataEvents {
  'market-data-update': (data: MarketUpdate) => void;
  'market-status-change': (status: MarketStatus) => void;
  'connection-status': (status: ConnectionStatus) => void;
}
```

### Renderer to Main Process

#### System Operations
```typescript
interface SystemOperations {
  'get-app-version': () => Promise<string>;
  'get-system-info': () => Promise<SystemInfo>;
  'open-external-link': (url: string) => void;
  'show-save-dialog': (options: SaveDialogOptions) => Promise<string | null>;
  'show-open-dialog': (options: OpenDialogOptions) => Promise<string[] | null>;
}
```

#### File Operations
```typescript
interface FileOperations {
  'read-file': (path: string) => Promise<string>;
  'write-file': (path: string, content: string) => Promise<void>;
  'export-data': (data: ExportData, format: ExportFormat) => Promise<string>;
  'import-data': (path: string) => Promise<ImportResult>;
}
```

#### Application Control
```typescript
interface AppControl {
  'restart-app': () => void;
  'quit-app': () => void;
  'check-for-updates': () => Promise<UpdateInfo | null>;
  'install-update': () => void;
}
```

## External Integrations

### Alpha Vantage API

#### Configuration
```typescript
interface AlphaVantageConfig {
  apiKey: string;
  baseUrl: string;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  timeout: number;
  retryAttempts: number;
}
```

#### API Methods
```typescript
class AlphaVantageService {
  /**
   * Get real-time stock quote
   */
  async getQuote(symbol: string): Promise<AlphaVantageQuote> {
    // Implementation details
  }

  /**
   * Get intraday data
   */
  async getIntradayData(
    symbol: string,
    interval: '1min' | '5min' | '15min' | '30min' | '60min'
  ): Promise<IntradayData[]> {
    // Implementation details
  }

  /**
   * Get daily data
   */
  async getDailyData(symbol: string): Promise<DailyData[]> {
    // Implementation details
  }

  /**
   * Search for symbols
   */
  async searchSymbols(query: string): Promise<SymbolSearchResult[]> {
    // Implementation details
  }
}
```

#### Response Types
```typescript
interface AlphaVantageQuote {
  '01. symbol': string;
  '02. open': string;
  '03. high': string;
  '04. low': string;
  '05. price': string;
  '06. volume': string;
  '07. latest trading day': string;
  '08. previous close': string;
  '09. change': string;
  '10. change percent': string;
}

interface IntradayData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
```

## Error Handling

### Custom Error Classes

#### TradeExecutionError
```typescript
class TradeExecutionError extends Error {
  constructor(
    message: string,
    public code: TradeErrorCode,
    public details?: any
  ) {
    super(message);
    this.name = 'TradeExecutionError';
  }

  getUserFriendlyMessage(): string {
    // Implementation details
  }

  getErrorCode(): TradeErrorCode {
    return this.code;
  }
}

enum TradeErrorCode {
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  INVALID_SYMBOL = 'INVALID_SYMBOL',
  MARKET_CLOSED = 'MARKET_CLOSED',
  INVALID_QUANTITY = 'INVALID_QUANTITY',
  POSITION_LIMIT_EXCEEDED = 'POSITION_LIMIT_EXCEEDED',
  MARGIN_REQUIREMENT_NOT_MET = 'MARGIN_REQUIREMENT_NOT_MET'
}
```

#### DataFetchError
```typescript
class DataFetchError extends Error {
  constructor(
    message: string,
    public source: DataSource,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'DataFetchError';
  }

  getRetryable(): boolean {
    // Implementation details
  }
}

enum DataSource {
  ALPHA_VANTAGE = 'ALPHA_VANTAGE',
  LOCAL_CACHE = 'LOCAL_CACHE',
  MOCK_SERVICE = 'MOCK_SERVICE'
}
```

### Error Handling Patterns

#### Service Error Handling
```typescript
async function handleServiceCall<T>(
  operation: () => Promise<T>,
  fallback?: () => Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error('Service call failed:', error);
    
    if (fallback) {
      try {
        return await fallback();
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        throw fallbackError;
      }
    }
    
    throw error;
  }
}
```

#### Component Error Boundaries
```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  constructor(props: PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error boundary caught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}
```

## Type Definitions

### Core Types

#### Position
```typescript
interface Position {
  id: string;
  symbol: string;
  type: 'stock' | 'call' | 'put';
  positionType: 'long' | 'short';
  quantity: number;
  strike?: number;
  expiry?: string;
  purchasePrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  unrealizedPL: number;
  lastUpdated: string;
  strategyId?: string;
}
```

#### Strategy
```typescript
interface Strategy {
  id: string;
  name: string;
  type: StrategyType;
  positions: string[];
  createdAt: string;
  status: 'active' | 'closed' | 'expired';
  totalPL: number;
  maxProfit: number;
  maxLoss: number;
  breakeven: number[];
}

type StrategyType = 'covered-call' | 'cash-secured-put' | 'collar' | 'custom';
```

#### Market Data Types
```typescript
interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  bid: number;
  ask: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
}

interface HistoricalData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
```

#### Performance Types
```typescript
interface PerformanceMetrics {
  messagesReceived: number;
  messagesProcessed: number;
  averageLatency: number;
  connectionUptime: number;
  reconnectCount: number;
  queueSize: number;
  batchesProcessed: number;
  lastMessageTime: number;
  cacheHitRate: number;
  cacheHits: number;
  cacheMisses: number;
}

interface PLUpdate {
  positionId: string;
  symbol: string;
  currentPrice: number;
  unrealizedPL: number;
  percentChange: number;
  timestamp: number;
  hasChanged: boolean;
}
```

## Utilities

### Formatting Utilities

#### Currency Formatting
```typescript
function formatCurrency(amount: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(amount);
}

function formatPercentage(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value / 100);
}
```

#### Date Formatting
```typescript
function formatDate(date: Date | string | number, format: DateFormat = 'short'): string {
  const dateObj = new Date(date);
  
  switch (format) {
    case 'short':
      return dateObj.toLocaleDateString();
    case 'long':
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    case 'time':
      return dateObj.toLocaleTimeString();
    case 'datetime':
      return dateObj.toLocaleString();
    default:
      return dateObj.toISOString();
  }
}

type DateFormat = 'short' | 'long' | 'time' | 'datetime' | 'iso';
```

### Validation Utilities

#### Input Validation
```typescript
function validateSymbol(symbol: string): ValidationResult {
  const errors: string[] = [];
  
  if (!symbol || symbol.trim().length === 0) {
    errors.push('Symbol is required');
  }
  
  if (symbol.length > 10) {
    errors.push('Symbol must be 10 characters or less');
  }
  
  if (!/^[A-Z]+$/.test(symbol)) {
    errors.push('Symbol must contain only uppercase letters');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings: []
  };
}

function validateQuantity(quantity: number): ValidationResult {
  const errors: string[] = [];
  
  if (!Number.isInteger(quantity)) {
    errors.push('Quantity must be a whole number');
  }
  
  if (quantity <= 0) {
    errors.push('Quantity must be greater than zero');
  }
  
  if (quantity > 10000) {
    errors.push('Quantity cannot exceed 10,000');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings: []
  };
}
```

### Calculation Utilities

#### Financial Calculations
```typescript
function calculateCompoundReturn(
  initialValue: number,
  finalValue: number,
  periods: number
): number {
  return Math.pow(finalValue / initialValue, 1 / periods) - 1;
}

function calculateSharpeRatio(
  returns: number[],
  riskFreeRate: number = 0.02
): number {
  const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
  const standardDeviation = Math.sqrt(variance);
  
  return (meanReturn - riskFreeRate) / standardDeviation;
}

function calculateMaxDrawdown(values: number[]): number {
  let maxDrawdown = 0;
  let peak = values[0];
  
  for (const value of values) {
    if (value > peak) {
      peak = value;
    }
    
    const drawdown = (peak - value) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  return maxDrawdown;
}
```

---

## Version Information

- **API Version**: 1.0.0
- **Last Updated**: December 2024
- **Compatibility**: Options Tutor 1.0.0+

## Support

For API questions or issues:
- **Documentation**: [docs.optionstutor.com](https://docs.optionstutor.com)
- **GitHub Issues**: [github.com/options-tutor/issues](https://github.com/options-tutor/issues)
- **Developer Discord**: [discord.gg/options-tutor-dev](https://discord.gg/options-tutor-dev)
- **Email**: api-support@optionstutor.com

---

*This API reference is automatically generated from TypeScript definitions and maintained by the Options Tutor development team.*