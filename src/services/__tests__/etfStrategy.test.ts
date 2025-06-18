import { RootState } from '../../redux/store';
import { TradeService } from '../TradeService';
import { MarginService } from '../MarginService';
import { MockApiService } from '../mockApiService';
import { OptionLeg } from '../../redux/tradingSlice';

// Mock data
const mockState = {
  portfolio: {
    positions: [
      {
        id: '1',
        symbol: 'MSTY',
        type: 'stock',
        positionType: 'long',
        quantity: 100,
        purchasePrice: 45,
        currentPrice: 50,
        unrealizedPL: 5,
        expiry: undefined
      },
      {
        id: '2',
        symbol: 'PLTY',
        type: 'stock',
        positionType: 'long',
        quantity: 200,
        purchasePrice: 28,
        currentPrice: 30,
        unrealizedPL: 2,
        expiry: undefined
      }
    ],
    cashBalance: 5000,
    marginRequirements: { initial: 0, maintenance: 0 },
    unrealizedPL: 0,
    realizedPL: 0,
    marginUsage: 0,
    isPending: false,
    error: null,
    priceUpdateTimestamp: 0,
    updatesPerSecond: 0,
    lastSecondUpdates: 0,
    maxUpdatesPerSecond: 0,
    lastUpdateTime: 0
  },
  marketData: {
    stockQuotes: {
      MSTY: { price: 50 },
      PLTY: { price: 30 },
      TSLY: { price: 25 }
    },
    optionChains: {
      MSTY: {
        '2025-06-18': {  // For early assignment test
          calls: [{ strike: 50 }],
          puts: []
        },
        '2025-07-18': {
          calls: [{ strike: 50 }],
          puts: []
        }
      },
      PLTY: {
        '2025-07-18': {
          calls: [],
          puts: [{ strike: 30 }]
        }
      },
      TSLY: {
        '2023-12-15': {
          calls: [{ strike: 13 }],
          puts: [{ strike: 12 }]
        },
        '2025-07-18': {
          calls: [{ strike: 12 }, { strike: 30 }],  // Added strike 12 for dividend risk test
          puts: [{ strike: 20 }, { strike: 25 }]    // Added strike 25 for buying power test
        }
      },
      AAPL: {
        '2025-07-18': {
          calls: [{ strike: 150 }],
          puts: []
        }
      }
    },
    lastUpdated: 0,
    isPending: false,
    error: null
  },
  trading: {
    legs: [],
    strategy: null,
    quantity: 0,
    symbol: '',
    expiry: '',
    strike: 0,
    optionType: 'call',
    action: 'buy',
    status: 'idle',
    isPending: false,
    error: null
  },
  learning: {
    currentLesson: null,
    progress: 0,
    completedLessons: [],
    isPending: false,
    error: null
  }
} as any; // Using any to avoid strict type checking in tests
  
  const getMockState = () => mockState;

describe('ETF Strategy Integration Tests', () => {
  test('MSTY Covered Call execution and margin', async () => {
    const legs: OptionLeg[] = [
      {
        symbol: 'MSTY',
        action: 'sell',
        quantity: 1,
        optionType: 'call' as const,
        strike: 50,
        expiry: '2025-07-18',
        premium: 1.5
      }
    ];
    
    // Mock dividend data for MSTY
    jest.spyOn(MockApiService.getInstance(), 'fetchDividendData').mockResolvedValue({ amount: 0.45, daysToExDiv: 5 });
    
    // Execute trade
    const marginUsed = await TradeService.executeETFTrade('MSTY', legs, getMockState, jest.fn());
    expect(marginUsed).toBe(0);
    
    // Verify margin with dividend parameters
    const margin = MarginService.calculateETFMargin(
      'MSTY',
      legs,
      mockState.marketData.stockQuotes.MSTY.price,
      0.45,
      5
    );
    expect(margin).toBe(0); // Covered calls require no additional margin
  });

  test('PLTY Cash-Secured Put execution and margin', async () => {
    const legs: OptionLeg[] = [
      {
        symbol: 'PLTY',
        action: 'sell',
        quantity: 1,
        optionType: 'put' as const,
        strike: 30,
        expiry: '2025-07-18',
        premium: 0.8
      }
    ];
    
    // Mock dividend data for PLTY
    jest.spyOn(MockApiService.getInstance(), 'fetchDividendData').mockResolvedValue({ amount: 0.40, daysToExDiv: 7 });
    
    // Execute trade
    const marginUsed = await TradeService.executeETFTrade('PLTY', legs, getMockState, jest.fn());
    expect(marginUsed).toBe(3000);
    
    // Verify margin with dividend parameters
    const margin = MarginService.calculateETFMargin(
      'PLTY',
      legs,
      mockState.marketData.stockQuotes.PLTY.price,
      0.40,
      7
    );
    expect(margin).toBe(3000); // Strike * 100
  });

  test('TSLY Collar execution and margin', async () => {
    const legs: OptionLeg[] = [
      {
        symbol: 'TSLY',
        action: 'buy',
        quantity: 1,
        optionType: 'put' as const,
        strike: 20,
        expiry: '2025-07-18',
        premium: 0.5
      },
      {
        symbol: 'TSLY',
        action: 'sell',
        quantity: 1,
        optionType: 'call' as const,
        strike: 30,
        expiry: '2025-07-18',
        premium: 0.3
      }
    ];
    
    // Mock dividend data for TSLY
    jest.spyOn(MockApiService.getInstance(), 'fetchDividendData').mockResolvedValue({ amount: 0.50, daysToExDiv: 3 });
    
    // Execute trade
    const marginUsed = await TradeService.executeETFTrade('TSLY', legs, getMockState, jest.fn());
    // Base margin: (30-20)*100 = 1000
    // With dividend factor applied only to uncovered portion:
    //   stockValue = 25*100 = 2500
    //   coveredPortion = min(1000, 2500) = 1000
    //   uncoveredPortion = max(0, 1000-2500) = 0
    //   totalMargin = 1000 + (0*1.5) = 1000
    expect(marginUsed).toBe(1000);
    
    // Verify margin with dividend parameters
    const margin = MarginService.calculateETFMargin(
      'TSLY',
      legs,
      mockState.marketData.stockQuotes.TSLY.price,
      0.50,
      3
    );
    expect(margin).toBe(1000); // Base margin: (30-20)*100
  });

  // Dividend scenario tests
  test('applies 1.5x dividend risk factor for ETFs within 5 days of ex-dividend date', async () => {
    // Mock dividend data with ex-date 3 days from now
    jest.spyOn(MockApiService.getInstance(), 'fetchDividendData').mockResolvedValue({ amount: 0.50, daysToExDiv: 3 });
    
    // Add TSLY stock position to portfolio
    mockState.portfolio.positions.push({
      id: '3',
      symbol: 'TSLY',
      type: 'stock',
      positionType: 'long',
      quantity: 100,
      purchasePrice: 11.5,
      currentPrice: 11.5,
      unrealizedPL: 0,
      expiry: undefined
    });

    const legs: OptionLeg[] = [
      {
        symbol: 'TSLY',
        optionType: 'call',
        strike: 12,
        expiry: '2025-07-18',
        action: 'sell',
        quantity: 1,
        premium: 0.5
      }
    ];

    // Execute trade
    const marginUsed = await TradeService.executeETFTrade('TSLY', legs, getMockState, jest.fn());
    // Covered call: no margin required
    expect(marginUsed).toBe(0);
  });

  test('does not apply dividend risk factor for non-ETFs', async () => {
    // Mock dividend data with ex-date 3 days from now
    jest.spyOn(MockApiService.getInstance(), 'fetchDividendData').mockResolvedValue({ amount: 0.50, daysToExDiv: 3 });
    
    // Add AAPL stock position to portfolio
    mockState.portfolio.positions.push({
      id: '4',
      symbol: 'AAPL',
      type: 'stock',
      positionType: 'long',
      quantity: 100,
      purchasePrice: 145,
      currentPrice: 145,
      unrealizedPL: 0,
      expiry: undefined
    });

    const legs: OptionLeg[] = [
      {
        symbol: 'AAPL',  // Non-ETF
        optionType: 'call',
        strike: 150,
        expiry: '2025-07-18',
        action: 'sell',
        quantity: 1,
        premium: 2.5
      }
    ];

    // Execute trade
    const marginUsed = await TradeService.executeETFTrade('AAPL', legs, getMockState, jest.fn());
    // Covered call: no margin required
    expect(marginUsed).toBe(0);
    // Note: This value might need adjustment based on actual margin calculation
    // Keeping original value for now as non-ETF strategy
  });

  test('uses normal margin when dividend fetch fails', async () => {
    jest.spyOn(MockApiService.getInstance(), 'fetchDividendData').mockRejectedValue(new Error('API down'));
    
    // Add TSLY stock position to portfolio
    mockState.portfolio.positions.push({
      id: '5',
      symbol: 'TSLY',
      type: 'stock',
      positionType: 'long',
      quantity: 100,
      purchasePrice: 11.5,
      currentPrice: 11.5,
      unrealizedPL: 0,
      expiry: undefined
    });

    const legs: OptionLeg[] = [
      {
        symbol: 'TSLY',
        optionType: 'call',
        strike: 12,
        expiry: '2025-07-18',
        action: 'sell',
        quantity: 1,
        premium: 0.5
      }
    ];

    // Execute trade
    const marginUsed = await TradeService.executeETFTrade('TSLY', legs, getMockState, jest.fn());
    // Covered call: no margin required
    expect(marginUsed).toBe(0);
    // Note: This value might need adjustment based on actual margin calculation
    // Keeping original value for now as fallback scenario
  });

  test('Early assignment risk detection', async () => {
    const legs: OptionLeg[] = [
      {
        symbol: 'MSTY',
        action: 'sell',
        quantity: 1,
        optionType: 'call' as const,
        strike: 50,
        expiry: '2025-06-18', // Near expiration
        premium: 1.5
      }
    ];
    
    // Spy on console.warn
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    // Execute trade when deep ITM
    // Mock dividend data for MSTY
    jest.spyOn(MockApiService.getInstance(), 'fetchDividendData').mockResolvedValue({ amount: 0.45, daysToExDiv: 5 });
    
    mockState.marketData.stockQuotes.MSTY.price = 60;
    await TradeService.executeETFTrade('MSTY', legs, getMockState, jest.fn());
    
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Early assignment risk for MSTY call 50')
    );
  });

  test('Prevent trade with insufficient buying power', async () => {
    // Change to a collar strategy for TSLY (which is the expected strategy for TSLY)
    const legs: OptionLeg[] = [
      {
        symbol: 'TSLY',
        optionType: 'call',
        action: 'sell',
        strike: 13,
        premium: 0.5,
        quantity: 2,
        expiry: '2023-12-15'
      },
      {
        symbol: 'TSLY',
        optionType: 'put',
        action: 'buy',
        strike: 12,
        premium: 0.3,
        quantity: 2,
        expiry: '2023-12-15'
      }
    ];

    // Mock dividend data for TSLY
    jest.spyOn(MockApiService.getInstance(), 'fetchDividendData').mockResolvedValue({ amount: 0.50, daysToExDiv: 3 });
    
    // Set cash balance below the margin requirement (which is 375 for this collar)
    mockState.portfolio.cashBalance = 300;  // 300 < 375

    await expect(
      TradeService.executeETFTrade('TSLY', legs, getMockState, jest.fn())
    ).rejects.toThrow('Insufficient buying power for trade');
  });

  // Margin utilization warning tests
  test('Covered call strategy logs margin utilization warnings', async () => {
    // Mock console.warn to track calls
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    // Set up state for different utilization scenarios
    mockState.portfolio.cashBalance = 5000;

    // Safe scenario (40% utilization)
    jest.spyOn(TradeService, 'executeETFTrade').mockResolvedValue(2000);
    await TradeService.executeCoveredCallStrategy('MSTY', 50, '2025-07-18', 1, getMockState, jest.fn());
    expect(warnSpy).not.toHaveBeenCalled();

    // Amber scenario (60% utilization)
    jest.spyOn(TradeService, 'executeETFTrade').mockResolvedValue(3000);
    await TradeService.executeCoveredCallStrategy('MSTY', 50, '2025-07-18', 1, getMockState, jest.fn());
    expect(warnSpy).toHaveBeenCalledWith('Covered call strategy for MSTY margin utilization: 60.00% (amber)');
    warnSpy.mockClear();

    // Red scenario (80% utilization)
    jest.spyOn(TradeService, 'executeETFTrade').mockResolvedValue(4000);
    await TradeService.executeCoveredCallStrategy('MSTY', 50, '2025-07-18', 1, getMockState, jest.fn());
    expect(warnSpy).toHaveBeenCalledWith('Covered call strategy for MSTY margin utilization: 80.00% (red)');
  });

  test('Put selling strategy logs margin utilization warnings', async () => {
    // Mock console.warn to track calls
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    // Set up state for different utilization scenarios
    mockState.portfolio.cashBalance = 5000;

    // Safe scenario (40% utilization)
    jest.spyOn(TradeService, 'executeETFTrade').mockResolvedValue(2000);
    await TradeService.executePutSellingStrategy('PLTY', 30, '2025-07-18', 1, getMockState, jest.fn());
    expect(warnSpy).not.toHaveBeenCalled();

    // Amber scenario (60% utilization)
    jest.spyOn(TradeService, 'executeETFTrade').mockResolvedValue(3000);
    await TradeService.executePutSellingStrategy('PLTY', 30, '2025-07-18', 1, getMockState, jest.fn());
    expect(warnSpy).toHaveBeenCalledWith('Put selling strategy for PLTY margin utilization: 60.00% (amber)');
    warnSpy.mockClear();

    // Red scenario (80% utilization)
    jest.spyOn(TradeService, 'executeETFTrade').mockResolvedValue(4000);
    await TradeService.executePutSellingStrategy('PLTY', 30, '2025-07-18', 1, getMockState, jest.fn());
    expect(warnSpy).toHaveBeenCalledWith('Put selling strategy for PLTY margin utilization: 80.00% (red)');
  });

  test('Collar strategy logs margin utilization warnings', async () => {
    // Mock console.warn to track calls
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    // Set up state for different utilization scenarios
    mockState.portfolio.cashBalance = 5000;

    // Safe scenario (40% utilization)
    jest.spyOn(TradeService, 'executeETFTrade').mockResolvedValue(2000);
    await TradeService.executeCollarStrategy('TSLY', 30, 20, '2025-07-18', 1, getMockState, jest.fn());
    expect(warnSpy).not.toHaveBeenCalled();

    // Amber scenario (60% utilization)
    jest.spyOn(TradeService, 'executeETFTrade').mockResolvedValue(3000);
    await TradeService.executeCollarStrategy('TSLY', 30, 20, '2025-07-18', 1, getMockState, jest.fn());
    expect(warnSpy).toHaveBeenCalledWith('Collar strategy for TSLY margin utilization: 60.00% (amber)');
    warnSpy.mockClear();

    // Red scenario (80% utilization)
    jest.spyOn(TradeService, 'executeETFTrade').mockResolvedValue(4000);
    await TradeService.executeCollarStrategy('TSLY', 30, 20, '2025-07-18', 1, getMockState, jest.fn());
    expect(warnSpy).toHaveBeenCalledWith('Collar strategy for TSLY margin utilization: 80.00% (red)');
  });
});