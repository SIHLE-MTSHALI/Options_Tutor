import { RiskMonitoringService } from '../RiskMonitoringService';
import { Position } from '../../redux/types';
import { MarketDataState } from '../../redux/marketDataSlice';
import { ETFStrategyState } from '../../redux/tradingSlice';

describe('RiskMonitoringService', () => {
  const mockMarketData: MarketDataState = {
    currentPrice: 150,
    volatility: 0.3,
    optionChains: {},
    historicalOptionChains: {},
    selectedSymbol: 'TSLA',
    stockQuotes: {
      AAPL: { price: 150 },
      MSFT: { price: 300 },
      SPY: { price: 450 }
    },
    historicalLoading: false,
    historicalError: null,
  };

  const mockPosition: Position = {
    id: '1',
    symbol: 'AAPL',
    quantity: 100,
    purchasePrice: 145,
    type: 'stock',
    positionType: 'long',
    currentPrice: 150,
    unrealizedPL: 500
  };

  const mockStrategy: ETFStrategyState = {
    id: 'strat1',
    name: 'Bull Call Spread',
    type: 'custom',
    symbol: 'SPY',
    currentPL: 500,
    targetYield: 0.1,
    parameters: {
      quantity: 1,
      strike: 440,
      expiry: '2023-12-15'
    }
  };

  describe('calculatePositionRisk', () => {
    it('calculates Greeks for stock position', () => {
      const risk = RiskMonitoringService.calculatePositionRisk(mockPosition, mockMarketData);
      
      expect(risk.delta).toBeCloseTo(100); // 100 shares * delta 1.0
      expect(risk.gamma).toBeCloseTo(0);
      expect(risk.theta).toBeCloseTo(0);
      expect(risk.vega).toBeCloseTo(0);
      expect(risk.marginRequirement).toBeCloseTo(150 * 100 * 0.5); // 50% margin for stocks
    });

    it('calculates Greeks for option position', () => {
      const optionPosition: Position = {
        ...mockPosition,
        type: 'call',
        strike: 145,
        expiry: '2023-12-15'
      };

      const risk = RiskMonitoringService.calculatePositionRisk(optionPosition, mockMarketData);
      
      // Should have non-zero Greeks for options
      expect(risk.delta).not.toBe(0);
      expect(risk.gamma).not.toBe(0);
      expect(risk.theta).not.toBe(0);
      expect(risk.vega).not.toBe(0);
      expect(risk.marginRequirement).toBeGreaterThan(0);
    });
  });

  describe('calculateStrategyRisk', () => {
    it('calculates strategy risk metrics', () => {
      const risk = RiskMonitoringService.calculateStrategyRisk(mockStrategy, mockMarketData, 10000);
      
      // Updated to use the actual return properties
      expect(risk.volatilityImpact).toBeDefined();
      expect(risk.dividendRisk).toBeDefined();
      expect(risk.marginUtilization.utilization).toBeGreaterThan(0);
    });

    it('handles undefined market data', () => {
      const risk = RiskMonitoringService.calculateStrategyRisk(mockStrategy, {
        currentPrice: 0,
        volatility: 0,
        optionChains: {},
        historicalOptionChains: {},
        selectedSymbol: '',
        stockQuotes: {},
        historicalLoading: false,
        historicalError: null,
      }, 10000);
      
      // Updated to use the actual return properties
      expect(risk.volatilityImpact).toBe(0);
      expect(risk.dividendRisk).toBe(0);
      expect(risk.marginUtilization.utilization).toBe(0);
    });
  });

  // TODO: Implement after checkThresholds is added
  describe.skip('checkThresholds', () => {
    it('detects margin threshold breaches', () => {
      // Mock portfolio with high margin utilization
      const portfolioRisk = {
        marginUtilization: { utilization: 0.85 },
        totalDelta: 500
      };

      const alerts = RiskMonitoringService.checkThresholds(portfolioRisk);
      
      expect(alerts).toContainEqual({
        type: 'margin',
        level: 'warning',
        message: 'Margin utilization exceeds 80%'
      });
    });

    it('detects delta threshold breaches', () => {
      // Mock portfolio with high delta
      const portfolioRisk = {
        marginUtilization: { utilization: 0.5 },
        totalDelta: 2000
      };

      const alerts = RiskMonitoringService.checkThresholds(portfolioRisk);
      
      expect(alerts).toContainEqual({
        type: 'delta',
        level: 'warning',
        message: 'Portfolio delta exceeds 1500'
      });
    });
  });
});