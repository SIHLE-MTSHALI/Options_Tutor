import { ETFStrategyState } from './tradingSlice';

export interface OptionLeg {
  id: string;
  symbol: string;
  quantity: number;
  action: 'buy' | 'sell';
  optionType: 'call' | 'put';
  strike?: number;
  expiry?: string;
  contractId?: string;
  premium: number;
}

export type AssetType = 'call' | 'put' | 'stock';
export type StrategyType = 'covered-call' | 'cash-secured-put' | 'collar' | 'custom';

export interface ETFStrategyConfig {
  name?: string;
  legs?: OptionLeg[];
  description?: string;
  type: StrategyType;
  symbol: string;
  quantity: number;
  strike?: number;
  expiry: string;
  putStrike?: number;
}

export interface Position {
  id: string;
  symbol: string;
  type: AssetType;
  positionType: 'long' | 'short';
  quantity: number;
  strike?: number;
  expiry?: string;
  purchasePrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  unrealizedPL: number;
  lastUpdated?: string;
  strategyId?: string;
}

export interface PortfolioState {
  cashBalance: number;
  positions: Position[];
  strategies: ETFStrategyState[];  // Added strategies array
  unrealizedPL: number;
  realizedPL: number;
  marginUsage: number;
  isPending: boolean;
  priceUpdateTimestamp: number;
  updatesPerSecond: number;
  lastSecondUpdates: number;
  maxUpdatesPerSecond: number;
  lastUpdateTime: number;
  strategyProfitLoss: { [strategyId: string]: number };
}