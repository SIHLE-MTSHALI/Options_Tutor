import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Subject, interval, Subscription, BehaviorSubject } from 'rxjs';
import { throttleTime, retryWhen, delay } from 'rxjs/operators';
import { batchUpdatePositionPrices, Position } from '../redux/portfolioSlice';

// Store reference will be injected via init function
let appStore: any = null;

/**
 * Initialize RealTimeService with Redux store reference
 * @param store Redux store instance
 */
export function initRealTimeService(store: any) {
  appStore = store;
}

const WS_URL = 'ws://localhost:3001'; // Replace with actual WebSocket URL

/**
 * Unified RealTimeService - Manages WebSocket connections for:
 * 1. Real-time portfolio P&L updates
 * 2. Real-time market price updates
 * Handles connection, reconnection, and data validation
 */
export class RealTimeService {
  private socket$: WebSocketSubject<any> | null = null;
  private connectionUrl: string | null = null;
  private initialReconnectInterval = 5000; // 5 seconds
  private maxReconnectInterval = 60000; // 60 seconds
  private reconnectSubscription: Subscription | null = null;
  private reconnectAttempts = 0;
  private lastMessageTime: number = Date.now();
  private heartbeatIntervalId: NodeJS.Timeout | null = null;
  private priceCache: Map<string, number> = new Map();
  private subscribedSymbols: Set<string> = new Set();
  private messageQueue: any[] = []; // Queue for messages during disconnects

  private resetReconnectionAttempts(): void {
    this.reconnectAttempts = 0;
    console.debug('[RECONNECT] Reset reconnection attempts counter');
  }

  private startHeartbeat(): void {
    if (this.heartbeatIntervalId) return;
    
    this.heartbeatIntervalId = setInterval(() => {
      if (this.connectionStatus$.value && this.socket$) {
        const now = Date.now();
        const timeSinceLastMessage = now - this.lastMessageTime;
        
        if (timeSinceLastMessage > 30000) {
          console.warn(`[HEARTBEAT] No message in ${timeSinceLastMessage}ms, sending ping`);
          this.socket$.next('ping');
        }
      }
    }, 30000) as NodeJS.Timeout; // 30-second heartbeat interval
  }

  private stopHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }



  // Subjects for updates
  public priceUpdates$ = new Subject<{ symbol: string; price: number }>();
  public plUpdates$ = new Subject<{ symbol: string; pl: number }>();
  
  // BehaviorSubject for connection status
  public connectionStatus$ = new BehaviorSubject<boolean>(false);
  
  // Add connection status to Redux store
  private updateReduxConnectionStatus(status: boolean): void {
    if (appStore) {
      appStore.dispatch({
        type: 'connection/setStatus',
        payload: status
      });
    }
  }

  constructor() {
    this.setupReconnectionLogic();
    // In development, skip WebSocket and use mock data
    if (process.env.NODE_ENV === 'development') {
      console.debug('[DEBUG] Development mode: Starting mock data simulation');
      this.simulateMockData();
    }
  }

  /**
   * Connects to the WebSocket server
   * @param url WebSocket server URL
   */
  connect(url: string): void {
    // Skip connection in development mode
    if (process.env.NODE_ENV === 'development') {
      console.debug('[DEBUG] Skipping WebSocket connection in development mode');
      return;
    }
    
    if (this.connectionStatus$.value) {
      console.debug('[DEBUG] Already connected to WebSocket');
      return;
    }
    
    this.connectionUrl = url;
    console.debug('[DEBUG] Connecting to WebSocket service at', url);

    try {
      this.socket$ = webSocket({
        url,
        openObserver: {
          next: () => {
            this.connectionStatus$.next(true);
            this.updateReduxConnectionStatus(true);
            console.log('[DEBUG] WebSocket connection opened');
            this.resetReconnectionAttempts();
            this.lastMessageTime = Date.now();
            this.startHeartbeat();
            
            // Flush queued messages and resubscribe to symbols
            this.flushMessageQueue();
            this.subscribedSymbols.forEach(symbol => {
              console.debug(`[DEBUG] Resubscribing to ${symbol} after reconnection`);
              this.subscribe(symbol);
            });
          }
        },
        closeObserver: {
          next: () => {
            this.connectionStatus$.next(false);
            this.updateReduxConnectionStatus(false);
            console.log('[DEBUG] WebSocket connection closed');
            this.stopHeartbeat();
            this.scheduleReconnection();
          }
        }
      });

      this.socket$.pipe(
        throttleTime(1000), // Throttle to 1 update per second
        retryWhen(errors => errors.pipe(delay(this.initialReconnectInterval)))
      ).subscribe({
        next: (message: any) => this.handleMessage(message),
        error: (err: any) => console.error('[ERROR] WebSocket error:', err)
      });
    } catch (error) {
      console.error('[ERROR] WebSocket connection failed:', error);
    }
  }

  /**
   * Disconnects from the WebSocket server
   */
  disconnect(): void {
    if (this.socket$) {
      this.socket$.complete();
      this.socket$ = null;
    }
    this.connectionStatus$.next(false);
    if (this.reconnectSubscription) {
      this.reconnectSubscription.unsubscribe();
      this.reconnectSubscription = null;
    }
  }

  /**
   * Subscribes to price updates for a symbol
   * @param symbol Financial instrument symbol
   */
  subscribe(symbol: string): void {
    this.subscribedSymbols.add(symbol);
    if (this.connectionStatus$.value && this.socket$) {
      console.debug(`[DEBUG] Subscribing to ${symbol}`);
      this.socket$.next({ action: 'subscribe', symbol });
    } else {
      console.debug(`[DEBUG] Queuing subscribe for ${symbol} (disconnected)`);
      this.messageQueue.push({ action: 'subscribe', symbol });
    }
  }

  /**
   * Unsubscribes from price updates for a symbol
   * @param symbol Financial instrument symbol
   */
  unsubscribe(symbol: string): void {
    this.subscribedSymbols.delete(symbol);
    if (this.connectionStatus$.value && this.socket$) {
      this.socket$.next({ action: 'unsubscribe', symbol });
    } else {
      console.debug(`[DEBUG] Queuing unsubscribe for ${symbol} (disconnected)`);
      this.messageQueue.push({ action: 'unsubscribe', symbol });
    }
  }

  /**
   * Gets the latest price for a symbol from cache
   * @param symbol Financial instrument symbol
   * @returns Latest price or null if not available
   */
  getLatestPrice(symbol: string): number | null {
    return this.priceCache.get(symbol) || null;
  }

  private setupReconnectionLogic(): void {
    // Skip reconnection logic in development mode
    if (process.env.NODE_ENV === 'development') return;
  }
  
  private calculateReconnectDelay(): number {
    // Exponential backoff with jitter: base * 2^attempts + random jitter
    const baseDelay = Math.min(
      this.initialReconnectInterval * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectInterval
    );
    const jitter = Math.floor(Math.random() * 1000); // Up to 1s jitter
    return baseDelay + jitter;
  }


  private scheduleReconnection(): void {
    if (!this.connectionUrl) return;
    
    const delay = this.calculateReconnectDelay();
    console.debug(`[RECONNECT] Scheduling reconnection in ${delay}ms (attempt #${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.reconnectAttempts++;
      if (this.connectionUrl) {
        this.connect(this.connectionUrl);
      }
    }, delay);
  }

  private handleMessage(message: any): void {
    try {
      this.lastMessageTime = Date.now(); // Update last message timestamp
      
      // Handle heartbeat pong
      if (message === 'pong') {
        console.debug('[HEARTBEAT] Received pong');
        return;
      }
      
      // Skip processing if message is HTTP response
      if (typeof message === 'string' && message.startsWith('HTTP/')) {
        console.error('[ERROR] Received HTTP response instead of WebSocket data:', message.substring(0, 200));
        return;
      }
      
      // Parse JSON if needed
      const parsed = typeof message === 'string' ? JSON.parse(message) : message;
      
      // Handle portfolio P&L updates (array of updates)
      if (Array.isArray(parsed)) {
        console.debug('[DEBUG] Received portfolio updates:', parsed);
        const updates = this.validatePortfolioUpdates(parsed);
        // Convert to price updates format expected by Redux
        const priceUpdates = updates.map(position => ({
          symbol: position.symbol,
          price: position.currentPrice,
          timestamp: Date.now()
        }));
        if (appStore) {
          appStore.dispatch(batchUpdatePositionPrices(priceUpdates));
        } else {
          console.error('[ERROR] Store not initialized in realTimeService');
        }
        return;
      }
      
      // Handle price updates (single symbol update)
      if (parsed && parsed.symbol) {
        if (parsed.price) {
          console.debug(`[DEBUG] Received price update for ${parsed.symbol}: ${parsed.price}`);
          // Update cache with latest price
          this.priceCache.set(parsed.symbol, parsed.price);
          
          // Emit price update to subscribers
          this.priceUpdates$.next({
            symbol: parsed.symbol,
            price: parsed.price
          });
        }
        if (parsed.unrealizedPnl) {
          console.debug(`[DEBUG] Received P&L update for ${parsed.symbol}: ${parsed.unrealizedPnl}`);
          this.plUpdates$.next({
            symbol: parsed.symbol,
            pl: parsed.unrealizedPnl
          });
        }
      }
    } catch (error) {
      console.error('[ERROR] Error processing WebSocket message:', error);
      console.error('Raw message that caused the error:', message);
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.connectionStatus$.value && this.socket$) {
      const message = this.messageQueue.shift();
      this.socket$.next(message);
      console.debug(`[DEBUG] Sent queued message: ${message.action} ${message.symbol}`);
    }
  }

  private validatePortfolioUpdates(message: any): Position[] {
    if (!Array.isArray(message)) {
      console.error('[ERROR] Invalid message format: expected array');
      throw new Error('Invalid message format');
    }

    return message.map(update => {
      if (typeof update !== 'object' || update === null) {
        console.error('[ERROR] Invalid update format:', update);
        throw new Error('Invalid update format');
      }

      const { symbol, position, averagePrice, unrealizedPnl } = update;
      if (typeof symbol !== 'string' || 
          typeof position !== 'number' || 
          typeof averagePrice !== 'number' || 
          typeof unrealizedPnl !== 'number') {
        console.error('[ERROR] Invalid update fields:', update);
        throw new Error('Invalid update fields');
      }

      return {
        symbol,
        quantity: position,
        purchasePrice: averagePrice,
        currentPrice: averagePrice + unrealizedPnl/position,
        unrealizedPL: unrealizedPnl
      } as Position;
    });
  }

  private simulateMockData(): void {
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];
    setInterval(() => {
      // Simulate portfolio updates
      const mockPosition: Position = {
        id: `mock-${symbols[Math.floor(Math.random() * symbols.length)]}`,
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
        type: 'stock',
        positionType: 'long',
        quantity: Math.floor(Math.random() * 100),
        purchasePrice: Math.random() * 300,
        currentPrice: Math.random() * 300,
        unrealizedPL: (Math.random() - 0.5) * 1000
      };
      console.log('[MOCK] Dispatching mock portfolio update:', mockPosition);
      if (appStore) {
        appStore.dispatch(batchUpdatePositionPrices([{
          symbol: mockPosition.symbol,
          price: mockPosition.currentPrice,
          timestamp: Date.now()
        }]));
      } else {
        console.error('[ERROR] Store not initialized in realTimeService');
      }
      
      // Simulate price updates
      const priceUpdate = {
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
        price: Math.random() * 300
      };
      console.log('[MOCK] Dispatching mock price update:', priceUpdate);
      this.priceUpdates$.next(priceUpdate);
    }, 2000);
  }
}


// Export singleton instance
export const realTimeService = new RealTimeService();