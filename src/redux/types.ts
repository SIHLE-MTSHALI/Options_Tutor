import { OptionLeg } from './tradingSlice';

export interface ETFStrategyConfig {
  name: string;
  legs: OptionLeg[];
  description: string;
}