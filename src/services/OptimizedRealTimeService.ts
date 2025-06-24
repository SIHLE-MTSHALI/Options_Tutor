import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Subject, interval, Subscription, BehaviorSubject, fromEvent } from 'rxjs';
import { throttleTime, retryWhen, delay, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { batchUpdatePositionPrices } from '../redux/portfolioSlice';

/**
 * Optimized Real-Time Service with performance improvements:
 * - Connection pooling and multiplexing
 * - Intelligent batching and throttling
 * - Memory-efficient message queuing
 * - Adaptive reconnection strategies
 * - Performance monitoring and metrics
 * - WebWorker support for heavy processing
 */

// Store reference
let appStore: any = null;

export function initOptimizedRealTimeService(store: any) {
  appStore = store;
}

interface ConnectionConfig {
  url: string;
  maxReconnectAttempts: number;
  initialReconnectDelay: number;
  maxReconnectDelay: number;
  heartbeatInterval: number;
  messageQueueLimit: number;
  batchSize: number;
  throttleMs: number;
}

interface PerformanceMetrics {
  messagesReceived: number;
  messagesProcessed: number;
  averageLatency: number;
  connectionUptime: number;
  reconnectCount: number;
  queueSize: number;
  batchesProcessed: number;
  lastMessageTime: number;
}

interface PriceUpdate {
  symbol: string;
  price: number;
  timestamp: number;
  volume?: number;
  change?: number;
  changePercent?: number;
}

interface BatchedUpdate {
  updates: PriceUpdate[];
  timestamp: number;
  batchId: string;
}

export class OptimizedRealTimeService {
  private static instance: OptimizedRealTimeService;
  private connections = new Map<string, WebSocketSubject<any>>();
  private config: ConnectionConfig;
  private isInitialized = false;
  
  // Performance optimizations
  private messageQueue: any[] = [];
  private batchProcessor: NodeJS.Timeout | null = null;
  private performanceMetrics: PerformanceMetrics;
  private connectionStartTime = 0;
  private latencyBuffer: number[] = [];
  private maxLatencyBufferSize = 100;
  
  // Subjects and subscriptions
  public priceUpdates$ = new Subject<PriceUpdate>();
  public batchedUpdates$ = new Subject<BatchedUpdate>();
  public connectionStatus$ = new BehaviorSubject<boolean>(false);
  public performanceMetrics$ = new BehaviorSubject<PerformanceMetrics | null>(null);
  
  // Subscription management
  private subscriptions = new Map<string, Subscription>();
  private subscribedSymbols = new Set<string>();
  private symbolSubscribers = new Map<string, Set<(update: PriceUpdate) => void>>();
  
  // Adaptive features
  private adaptiveThrottling = true;
  private currentThrottleMs = 1000;
  private volatilityThreshold = 0.02;
  
  // WebWorker for heavy processing (if available)
  private worker: Worker | null = null;
  private workerSupported = false;

  private constructor() {
    this.config = {
      url: 'ws://localhost:3001',
      maxReconnectAttempts: 10,
      initialReconnectDelay: 1000,
      maxReconnectDelay: 30000,
      heartbeatInterval: 30000,
      messageQueueLimit: 1000,
      batchSize: 50,
      throttleMs: 1000
    };

    this.performanceMetrics = {
      messagesReceived: 0,
      messagesProcessed: 0,
      averageLatency: 0,
      connectionUptime: 0,
      reconnectCount: 0,
      queueSize: 0,
      batchesProcessed: 0,
      lastMessageTime: 0
    };

    this.initializeWorker();
    this.setupBatchProcessor();
    this.setupPerformanceMonitoring();
  }

  public static getInstance(): OptimizedRealTimeService {
    if (!OptimizedRealTimeService.instance) {
      OptimizedRealTimeService.instance = new OptimizedRealTimeService();
    }
    return OptimizedRealTimeService.instance;
  }

  /**
   * Initialize WebWorker for heavy processing
   */
  private initializeWorker(): void {
    if (typeof Worker !== 'undefined') {
      try {
        // Create inline worker for price calculations
        const workerScript = `
          self.onmessage = function(e) {
            const { type, data } = e.data;
            
            switch(type) {
              case 'BATCH_PROCESS':
                const processed = processPriceBatch(data);
                self.postMessage({ type: 'BATCH_PROCESSED', data: processed });
                break;
              case 'CALCULATE_METRICS':
                const metrics = calculatePerformanceMetrics(data);
                self.postMessage({ type: 'METRICS_CALCULATED', data: metrics });
                break;
            }
          };
          
          function processPriceBatch(updates) {
            return updates.map(update => ({
              ...update,
              processed: true,
              processedAt: Date.now()
            }));
          }
          
          function calculatePerformanceMetrics(data) {
            const { latencies } = data;
            const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
            return {
              averageLatency: avg,
              maxLatency: Math.max(...latencies),
              minLatency: Math.min(...latencies)
            };
          }
        `;

        const blob = new Blob([workerScript], { type: 'application/javascript' });
        this.worker = new Worker(URL.createObjectURL(blob));
        this.workerSupported = true;

        this.worker.onmessage = (e) => {
          const { type, data } = e.data;
          this.handleWorkerMessage(type, data);
        };

        console.log('[OptimizedRT] WebWorker initialized successfully');
      } catch (error) {
        console.warn('[OptimizedRT] WebWorker not available:', error);
        this.workerSupported = false;
      }
    }
  }

  /**
   * Handle messages from WebWorker
   */
  private handleWorkerMessage(type: string, data: any): void {
    switch (type) {
      case 'BATCH_PROCESSED':
        this.handleProcessedBatch(data);
        break;
      case 'METRICS_CALCULATED':
        this.updatePerformanceMetrics(data);
        break;
    }
  }

  /**
   * Setup batch processor for efficient updates
   */
  private setupBatchProcessor(): void {
    this.batchProcessor = setInterval(() => {
      this.processBatchedUpdates();
    }, this.config.throttleMs);
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    // Monitor connection uptime
    setInterval(() => {
      if (this.connectionStatus$.value) {
        this.performanceMetrics.connectionUptime = Date.now() - this.connectionStartTime;
      }
      this.performanceMetrics$.next({ ...this.performanceMetrics });
    }, 5000);

    // Monitor memory usage
    if (typeof window !== 'undefined' && 'performance' in window) {
      setInterval(() => {
        const memory = (performance as any).memory;
        if (memory) {
          console.debug('[OptimizedRT] Memory usage:', {
            used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB',
            total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + 'MB',
            limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
          });
        }
      }, 30000);
    }
  }

  /**
   * Connect with optimized connection management
   */
  public connect(url?: string): void {
    const connectionUrl = url || this.config.url;
    
    if (this.connections.has(connectionUrl)) {
      console.warn('[OptimizedRT] Already connected to', connectionUrl);
      return;
    }

    console.log('[OptimizedRT] Connecting to', connectionUrl);
    this.connectionStartTime = Date.now();

    const socket$ = webSocket({
      url: connectionUrl,
      openObserver: {
        next: () => {
          console.log('[OptimizedRT] Connected successfully');
          this.connectionStatus$.next(true);
          this.onConnectionEstablished(connectionUrl);
        }
      },
      closeObserver: {
        next: () => {
          console.log('[OptimizedRT] Connection closed');
          this.connectionStatus$.next(false);
          this.onConnectionClosed(connectionUrl);
        }
      }
    });

    this.connections.set(connectionUrl, socket$);
    this.setupMessageHandling(socket$, connectionUrl);
    this.setupReconnection(connectionUrl);
  }

  /**
   * Setup optimized message handling
   */
  private setupMessageHandling(socket$: WebSocketSubject<any>, url: string): void {
    const subscription = socket$
      .pipe(
        // Throttle based on current settings
        throttleTime(this.currentThrottleMs),
        // Remove duplicate messages
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
      )
      .subscribe({
        next: (message) => {
          this.handleMessage(message);
        },
        error: (error) => {
          console.error('[OptimizedRT] WebSocket error:', error);
          this.handleConnectionError(url, error);
        }
      });

    this.subscriptions.set(url, subscription);
  }

  /**
   * Optimized message handling with batching
   */
  private handleMessage(message: any): void {
    const receiveTime = Date.now();
    this.performanceMetrics.messagesReceived++;
    this.performanceMetrics.lastMessageTime = receiveTime;

    try {
      // Calculate latency if timestamp is available
      if (message.timestamp) {
        const latency = receiveTime - message.timestamp;
        this.updateLatencyMetrics(latency);
      }

      // Queue message for batch processing
      this.queueMessage(message);

      // Adaptive throttling based on message volume
      if (this.adaptiveThrottling) {
        this.adjustThrottling();
      }

    } catch (error) {
      console.error('[OptimizedRT] Error handling message:', error);
    }
  }

  /**
   * Queue message for batch processing
   */
  private queueMessage(message: any): void {
    if (this.messageQueue.length >= this.config.messageQueueLimit) {
      // Remove oldest messages to prevent memory overflow
      this.messageQueue.splice(0, this.config.batchSize);
      console.warn('[OptimizedRT] Message queue limit reached, dropping old messages');
    }

    this.messageQueue.push({
      ...message,
      queuedAt: Date.now()
    });

    this.performanceMetrics.queueSize = this.messageQueue.length;
  }

  /**
   * Process batched updates efficiently
   */
  private processBatchedUpdates(): void {
    if (this.messageQueue.length === 0) return;

    const batchSize = Math.min(this.config.batchSize, this.messageQueue.length);
    const batch = this.messageQueue.splice(0, batchSize);
    
    if (this.workerSupported && this.worker && batch.length > 10) {
      // Use WebWorker for large batches
      this.worker.postMessage({
        type: 'BATCH_PROCESS',
        data: batch
      });
    } else {
      // Process in main thread for small batches
      this.handleProcessedBatch(batch);
    }

    this.performanceMetrics.batchesProcessed++;
    this.performanceMetrics.queueSize = this.messageQueue.length;
  }

  /**
   * Handle processed batch updates
   */
  private handleProcessedBatch(batch: any[]): void {
    const priceUpdates: PriceUpdate[] = [];
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    for (const message of batch) {
      try {
        const update = this.parseMessage(message);
        if (update) {
          priceUpdates.push(update);
          this.priceUpdates$.next(update);
          this.notifySymbolSubscribers(update);
        }
        this.performanceMetrics.messagesProcessed++;
      } catch (error) {
        console.error('[OptimizedRT] Error parsing message:', error);
      }
    }

    if (priceUpdates.length > 0) {
      const batchedUpdate: BatchedUpdate = {
        updates: priceUpdates,
        timestamp: Date.now(),
        batchId
      };

      this.batchedUpdates$.next(batchedUpdate);
      this.updateReduxStore(priceUpdates);
    }
  }

  /**
   * Parse message into PriceUpdate
   */
  private parseMessage(message: any): PriceUpdate | null {
    try {
      // Handle different message formats
      if (message.type === 'price_update') {
        return {
          symbol: message.symbol,
          price: parseFloat(message.price),
          timestamp: message.timestamp || Date.now(),
          volume: message.volume ? parseInt(message.volume) : undefined,
          change: message.change ? parseFloat(message.change) : undefined,
          changePercent: message.changePercent ? parseFloat(message.changePercent) : undefined
        };
      }

      // Handle legacy format
      if (message.symbol && message.price) {
        return {
          symbol: message.symbol,
          price: parseFloat(message.price),
          timestamp: Date.now()
        };
      }

      return null;
    } catch (error) {
      console.error('[OptimizedRT] Error parsing message:', message, error);
      return null;
    }
  }

  /**
   * Update Redux store with batched updates
   */
  private updateReduxStore(updates: PriceUpdate[]): void {
    if (!appStore) return;

    // Group updates by symbol to avoid duplicate dispatches
    const symbolUpdates = new Map<string, PriceUpdate>();
    for (const update of updates) {
      symbolUpdates.set(update.symbol, update);
    }

    // Dispatch batched update
    const batchedPrices = Array.from(symbolUpdates.values()).map(update => ({
      symbol: update.symbol,
      price: update.price,
      timestamp: update.timestamp
    }));

    appStore.dispatch(batchUpdatePositionPrices(batchedPrices));
  }

  /**
   * Subscribe to specific symbol updates
   */
  public subscribeToSymbol(
    symbol: string, 
    callback: (update: PriceUpdate) => void,
    options: { throttleMs?: number; minChangeThreshold?: number } = {}
  ): () => void {
    if (!this.symbolSubscribers.has(symbol)) {
      this.symbolSubscribers.set(symbol, new Set());
    }

    const wrappedCallback = (update: PriceUpdate) => {
      // Apply filtering if specified
      if (options.minChangeThreshold && update.changePercent !== undefined) {
        if (Math.abs(update.changePercent) < options.minChangeThreshold) {
          return;
        }
      }

      callback(update);
    };

    this.symbolSubscribers.get(symbol)!.add(wrappedCallback);
    this.subscribedSymbols.add(symbol);

    // Send subscription message to server
    this.sendSubscriptionMessage(symbol, true);

    return () => {
      const subscribers = this.symbolSubscribers.get(symbol);
      if (subscribers) {
        subscribers.delete(wrappedCallback);
        if (subscribers.size === 0) {
          this.symbolSubscribers.delete(symbol);
          this.subscribedSymbols.delete(symbol);
          this.sendSubscriptionMessage(symbol, false);
        }
      }
    };
  }

  /**
   * Notify symbol-specific subscribers
   */
  private notifySymbolSubscribers(update: PriceUpdate): void {
    const subscribers = this.symbolSubscribers.get(update.symbol);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(update);
        } catch (error) {
          console.error('[OptimizedRT] Error in symbol subscriber:', error);
        }
      });
    }
  }

  /**
   * Send subscription message to server
   */
  private sendSubscriptionMessage(symbol: string, subscribe: boolean): void {
    const message = {
      type: subscribe ? 'subscribe' : 'unsubscribe',
      symbol,
      timestamp: Date.now()
    };

    for (const [url, socket$] of this.connections) {
      try {
        socket$.next(message);
      } catch (error) {
        console.error(`[OptimizedRT] Failed to send subscription message to ${url}:`, error);
      }
    }
  }

  /**
   * Update latency metrics
   */
  private updateLatencyMetrics(latency: number): void {
    this.latencyBuffer.push(latency);
    
    if (this.latencyBuffer.length > this.maxLatencyBufferSize) {
      this.latencyBuffer.shift();
    }

    // Calculate rolling average
    this.performanceMetrics.averageLatency = 
      this.latencyBuffer.reduce((a, b) => a + b, 0) / this.latencyBuffer.length;
  }

  /**
   * Adaptive throttling based on message volume and volatility
   */
  private adjustThrottling(): void {
    const messageRate = this.performanceMetrics.messagesReceived / 
      (this.performanceMetrics.connectionUptime / 1000 || 1);

    // Adjust throttling based on message rate
    if (messageRate > 100) {
      this.currentThrottleMs = Math.min(this.currentThrottleMs * 1.1, 5000);
    } else if (messageRate < 10) {
      this.currentThrottleMs = Math.max(this.currentThrottleMs * 0.9, 100);
    }

    console.debug(`[OptimizedRT] Adjusted throttling to ${this.currentThrottleMs}ms (rate: ${messageRate.toFixed(1)} msg/s)`);
  }

  /**
   * Connection management
   */
  private onConnectionEstablished(url: string): void {
    console.log(`[OptimizedRT] Connection established to ${url}`);
    
    // Resubscribe to symbols
    for (const symbol of this.subscribedSymbols) {
      this.sendSubscriptionMessage(symbol, true);
    }

    // Process any queued messages
    if (this.messageQueue.length > 0) {
      console.log(`[OptimizedRT] Processing ${this.messageQueue.length} queued messages`);
      this.processBatchedUpdates();
    }
  }

  private onConnectionClosed(url: string): void {
    console.log(`[OptimizedRT] Connection closed to ${url}`);
    this.performanceMetrics.reconnectCount++;
  }

  private handleConnectionError(url: string, error: any): void {
    console.error(`[OptimizedRT] Connection error to ${url}:`, error);
    // Reconnection will be handled by RxJS retryWhen operator
  }

  private setupReconnection(url: string): void {
    const socket$ = this.connections.get(url);
    if (!socket$) return;

    socket$.pipe(
      retryWhen(errors => 
        errors.pipe(
          delay(this.config.initialReconnectDelay),
          // Exponential backoff with jitter
          delay(() => {
            const backoff = Math.min(
              this.config.initialReconnectDelay * Math.pow(2, this.performanceMetrics.reconnectCount),
              this.config.maxReconnectDelay
            );
            const jitter = Math.random() * 1000;
            return backoff + jitter;
          })
        )
      )
    ).subscribe();
  }

  /**
   * Disconnect and cleanup
   */
  public disconnect(url?: string): void {
    if (url) {
      const socket$ = this.connections.get(url);
      if (socket$) {
        socket$.complete();
        this.connections.delete(url);
      }
      
      const subscription = this.subscriptions.get(url);
      if (subscription) {
        subscription.unsubscribe();
        this.subscriptions.delete(url);
      }
    } else {
      // Disconnect all
      for (const [url, socket$] of this.connections) {
        socket$.complete();
      }
      this.connections.clear();
      
      for (const [url, subscription] of this.subscriptions) {
        subscription.unsubscribe();
      }
      this.subscriptions.clear();
    }

    this.connectionStatus$.next(false);
    console.log('[OptimizedRT] Disconnected');
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.disconnect();
    
    if (this.batchProcessor) {
      clearInterval(this.batchProcessor);
      this.batchProcessor = null;
    }

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    this.messageQueue = [];
    this.symbolSubscribers.clear();
    this.subscribedSymbols.clear();
    
    console.log('[OptimizedRT] Service destroyed');
  }

  /**
   * Get comprehensive status and metrics
   */
  public getStatus() {
    return {
      isConnected: this.connectionStatus$.value,
      connections: this.connections.size,
      subscribedSymbols: this.subscribedSymbols.size,
      queueSize: this.messageQueue.length,
      performanceMetrics: this.performanceMetrics,
      config: this.config,
      adaptiveThrottling: this.adaptiveThrottling,
      currentThrottleMs: this.currentThrottleMs,
      workerSupported: this.workerSupported
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<ConnectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('[OptimizedRT] Configuration updated:', newConfig);
  }

  /**
   * Enable/disable adaptive throttling
   */
  public setAdaptiveThrottling(enabled: boolean): void {
    this.adaptiveThrottling = enabled;
    console.log(`[OptimizedRT] Adaptive throttling ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Export singleton instance
export const optimizedRealTimeService = OptimizedRealTimeService.getInstance();