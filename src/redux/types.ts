export type AssetType = 'call' | 'put' | 'stock';

export interface OptionLeg {
  symbol: string;
  quantity: number;
  action: 'buy' | 'sell';
  optionType?: 'call' | 'put'; // Only for options
  strike?: number;
  expiry?: string;
  premium: number;
}

export interface ETFStrategyConfig {
  name: string;
  legs: OptionLeg[];
  description: string;
  type?: string;
  symbol?: string;
  quantity?: number;
  strike?: number;
  expiry?: string;
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