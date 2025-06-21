import { BlackScholes } from './pricingModels/BlackScholes';
import { getHistoricalVolatility } from './marketDataService';
import { DividendCalendar } from './dividendCalendar';

/**
 * Calculates early assignment probability using Black-Scholes model
 * @param optionType 'call' | 'put'
 * @param underlyingPrice Current price of underlying asset
 * @param strikePrice Option strike price
 * @param timeToExpiry Time to expiry in years
 * @param volatility Annualized volatility (decimal)
 * @param riskFreeRate Risk-free interest rate (decimal)
 * @returns Probability of early assignment (0-1)
 */
export function calculateEarlyAssignmentProbability(
  optionType: 'call' | 'put',
  underlyingPrice: number,
  strikePrice: number,
  timeToExpiry: number,
  volatility: number,
  riskFreeRate: number = 0.03
): number {
  const bs = new BlackScholes(
    underlyingPrice,
    strikePrice,
    timeToExpiry,
    volatility,
    riskFreeRate
  );
  
  return optionType === 'call' 
    ? bs.callDelta() 
    : -bs.putDelta();
}

/**
 * Calculates volatility impact on strategy
 * @param strategyType Strategy type
 * @param symbol ETF symbol
 * @param baseMargin Base margin requirement
 * @returns Adjusted margin requirement based on volatility
 */
export async function calculateVolatilityImpact(
  strategyType: 'covered-call' | 'cash-secured-put' | 'collar' | 'custom',
  symbol: string,
  baseMargin: number
): Promise<number> {
  const historicalVol = await getHistoricalVolatility(symbol);
  const vixFactor = historicalVol / 20; // Normalize to VIX=20 baseline
  
  let multiplier;
  switch(strategyType) {
    case 'covered-call':
      multiplier = 1.2;
      break;
    case 'cash-secured-put':
      multiplier = 1.5;
      break;
    case 'collar':
      multiplier = 1.1;
      break;
    case 'custom':
      // Use a conservative multiplier for custom strategies
      multiplier = 1.4;
      break;
    default:
      multiplier = 1.3;
  }
  
  return baseMargin * vixFactor * multiplier;
}

/**
 * Calculates dividend risk
 * @param symbol ETF symbol
 * @param expiry Option expiry date
 * @returns Risk score (0-10) based on dividend proximity
 */
export function calculateDividendRisk(symbol: string, expiry: string): number {
  const nextExDividendDate = new DividendCalendar().getNextExDividendDate(symbol);
  if (!nextExDividendDate) return 0;
  
  const daysToDiv = (nextExDividendDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  const expiryDate = new Date(expiry);
  const daysToExpiry = (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  
  if (daysToDiv > 0 && daysToDiv < daysToExpiry) {
    return Math.min(10, 10 * (1 - daysToDiv/30));
  }
  
  return 0;
}