import { TradeService } from '../TradeService';
import { MarginService } from '../MarginService';
import { MockApiService } from '../mockApiService';
import { RootState } from '../../redux/store';
import { OptionLeg } from '../../redux/tradingSlice';
import { addPosition } from '../../redux/portfolioSlice';
import { updateStockQuote } from '../../redux/marketDataSlice';

// Mock dependencies
jest.mock('../MarginService');
jest.mock('../mockApiService');

const mockGetState = jest.fn();
const mockDispatch = jest.fn();

describe('TradeService Integration Tests', () => {
  const sampleLeg: OptionLeg = {
    id: '1',
    contractId: 'AAPL_121523C150',
    symbol: 'AAPL',
    strike: 150,
    expiry: '2023-12-15',
    optionType: 'call',
    action: 'buy',
    quantity: 1,
    premium: 2.5
  };

  const mockState = {
    marketData: {
      stockQuotes: { AAPL: { price: 151 } },
      optionChains: {
        AAPL: {
          '2023-12-15': {
            calls: [
              {
                strike: 150,
                lastPrice: 2.5,
                bid: 2.45,
                ask: 2.55,
                volume: 100,
                openInterest: 200,
                impliedVol: 0.3,
                expiry: '2023-12-15'
              },
              {
                strike: 155,
                lastPrice: 1.5,
                bid: 1.45,
                ask: 1.55,
                volume: 100,
                openInterest: 200,
                impliedVol: 0.3,
                expiry: '2023-12-15'
              }
            ],
            puts: []
          }
        }
      },
      currentPrice: 151,
      volatility: 0.3,
      historicalOptionChains: {},
      selectedSymbol: 'AAPL',
      status: 'succeeded',
      error: null,
      historicalLoading: false,
      historicalError: null
    },
    portfolio: {
      cashBalance: 10000,
      positions: [],
      strategies: [],
      unrealizedPL: 0,
      realizedPL: 0,
      marginUsage: 0,
      priceUpdateTimestamp: 0,
      updatesPerSecond: 0,
      lastSecondUpdates: 0,
      maxUpdatesPerSecond: 0,
      lastUpdateTime: 0,
      isPending: false,
      lastUpdated: Date.now(),
      initialInvestment: 10000,
      status: 'idle',
      strategyProfitLoss: {}
    },
    trading: {
      selectedLeg: null,
      legs: [],
      orderType: 'limit',
      status: 'idle',
      error: null,
      selectedStrategy: null,
      showPayoffDiagram: false,
      showRiskGraph: false,
      tradeError: null,
      accountId: 'test-account',
      etfStrategies: []
    },
    learning: {
      activeLesson: null,
      completedLessons: [],
      status: 'idle',
      error: null,
      currentWorld: 0,
      worlds: [],
      xp: 0,
      riskProfile: 'balanced',
      journalEntries: []
    }
  } as unknown as RootState;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetState.mockReturnValue(mockState);
    (MarginService.calculateMargin as jest.Mock).mockReturnValue(250);
    
    // Create a mock instance for the ApiService
    const mockApiInstance = {
      fetchStockQuote: jest.fn().mockResolvedValue({ price: 151 })
    };
    (MockApiService.getInstance as jest.Mock).mockReturnValue(mockApiInstance);
  });

  test('successful trade execution creates position and returns margin', async () => {
    const margin = await TradeService.executeTrade([sampleLeg], mockGetState, mockDispatch);
    
    expect(margin).toBe(250);
    expect(mockDispatch).toHaveBeenCalledWith(addPosition(expect.objectContaining({
      symbol: 'AAPL',
      strike: 150,
      quantity: 1
    })));
    expect(MarginService.calculateMargin).toHaveBeenCalled();
  });

  test('throws error for invalid legs', async () => {
    const invalidState = { 
      ...mockState, 
      marketData: { 
        ...mockState.marketData,
        optionChains: {} 
      } 
    } as unknown as RootState;
    mockGetState.mockReturnValue(invalidState);

    await expect(
      TradeService.executeTrade([sampleLeg], mockGetState, mockDispatch)
    ).rejects.toThrow('Invalid trade legs');
  });

  test('throws error for insufficient margin', async () => {
    (MarginService.calculateMargin as jest.Mock).mockReturnValue(15000);
    
    await expect(
      TradeService.executeTrade([sampleLeg], mockGetState, mockDispatch)
    ).rejects.toThrow('Insufficient buying power');
  });

  test('fetches stock quote when not in state and updates store', async () => {
    const noQuoteState = { 
      ...mockState, 
      marketData: { 
        ...mockState.marketData, 
        stockQuotes: {} 
      } 
    } as unknown as RootState;
    mockGetState.mockReturnValue(noQuoteState);

    await TradeService.executeTrade([sampleLeg], mockGetState, mockDispatch);
    
    expect(MockApiService.getInstance().fetchStockQuote).toHaveBeenCalledWith('AAPL');
    expect(mockDispatch).toHaveBeenCalledWith(updateStockQuote({ symbol: 'AAPL', price: 151 }));
  });

  test('handles API error during stock quote fetch', async () => {
    const noQuoteState = { 
      ...mockState, 
      marketData: { 
        ...mockState.marketData, 
        stockQuotes: {} 
      } 
    } as unknown as RootState;
    mockGetState.mockReturnValue(noQuoteState);
    (MockApiService.getInstance().fetchStockQuote as jest.Mock).mockRejectedValue(new Error('API error'));

    await expect(
      TradeService.executeTrade([sampleLeg], mockGetState, mockDispatch)
    ).rejects.toThrow('Failed to fetch stock quote for AAPL');
  });

  test('validates margin calculation logic with different leg types', async () => {
    const spreadLegs: OptionLeg[] = [
      { ...sampleLeg, action: 'buy' },
      { ...sampleLeg, action: 'sell', strike: 155 }
    ];
    
    (MarginService.calculateMargin as jest.Mock).mockImplementation((legs) => {
      return legs.length === 2 ? 500 : 250;
    });

    const margin = await TradeService.executeTrade(spreadLegs, mockGetState, mockDispatch);
    expect(margin).toBe(500);
  });
});