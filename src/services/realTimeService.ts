import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Subject, interval, Subscription, BehaviorSubject } from 'rxjs';
import { retryWhen, delay } from 'rxjs/operators';

/**
 * RealTimeService - Manages WebSocket connections for real-time market data
 * Handles connection, reconnection, price updates, and connection status
 */
class RealTimeService {
  private socket$: WebSocketSubject<any> | null = null;
  private connectionUrl: string | null = null;
  private reconnectInterval = 5000; // 5 seconds
  private reconnectSubscription: Subscription | null = null;
  private priceCache: Map<string, number> = new Map();
  private subscribedSymbols: Set<string> = new Set();

  // Subjects for updates
  public priceUpdates$ = new Subject<{ symbol: string; price: number }>();
  public plUpdates$ = new Subject<{ symbol: string; pl: number }>();
  
  // BehaviorSubject for connection status
  public connectionStatus$ = new BehaviorSubject<boolean>(false);

  constructor() {
    this.setupReconnectionLogic();
  }

  /**
   * Connects to the WebSocket server
   * @param url WebSocket server URL
   */
  connect(url: string): void {
    if (this.connectionStatus$.value) return;
    this.connectionUrl = url;

    this.socket$ = webSocket({
      url,
      openObserver: {
        next: () => {
          this.connectionStatus$.next(true);
          console.log('WebSocket connected');
          // Resubscribe to symbols after reconnection
          this.subscribedSymbols.forEach(symbol => this.subscribe(symbol));
        }
      },
      closeObserver: {
        next: () => {
          this.connectionStatus$.next(false);
          console.log('WebSocket disconnected');
          this.scheduleReconnection();
        }
      }
    });

    this.socket$!.pipe(
      retryWhen(errors => errors.pipe(delay(this.reconnectInterval)))
    ).subscribe({
      next: (message: any) => this.handleMessage(message),
      error: (err: any) => console.error('WebSocket error:', err)
    });
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
      this.socket$.next({ action: 'subscribe', symbol });
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
    this.reconnectSubscription = interval(this.reconnectInterval).subscribe(() => {
      if (!this.connectionStatus$.value && this.connectionUrl) {
        console.log('Attempting to reconnect...');
        this.connect(this.connectionUrl);
      }
    });
  }

  private scheduleReconnection(): void {
    if (!this.reconnectSubscription && this.connectionUrl) {
      setTimeout(() => this.connect(this.connectionUrl!), this.reconnectInterval);
    }
  }

  private handleMessage(message: { symbol: string; price: number, pl?: number }): void {
    if (message && message.symbol) {
      if (message.price) {
        // Update cache with latest price
        this.priceCache.set(message.symbol, message.price);
        
        // Emit price update to subscribers
        this.priceUpdates$.next({
          symbol: message.symbol,
          price: message.price
        });
      }
      
      if (message.pl !== undefined) {
        // Emit P&L update to subscribers
        this.plUpdates$.next({
          symbol: message.symbol,
          pl: message.pl
        });
      }
    }
  }
}

// Export as singleton instance
export const realTimeService = new RealTimeService();

// For testing purposes - Mock version when in development
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Mock connection status
  realTimeService.connectionStatus$.next(true);
  
  // Mock price updates every second
  setInterval(() => {
    const mockPrice = Math.random() * 100 + 50;
    const mockPL = (mockPrice - 75) * 10; // Example calculation
    
    realTimeService.priceUpdates$.next({
      symbol: 'MOCK',
      price: mockPrice
    });
    
    realTimeService.plUpdates$.next({
      symbol: 'MOCK',
      pl: mockPL
    });
  }, 1000);
}