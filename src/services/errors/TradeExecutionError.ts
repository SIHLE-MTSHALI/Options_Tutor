import { DataFetchError } from './DataFetchError';

/**
 * Custom error class for trade execution failures
 */
export class TradeExecutionError extends Error {
  public readonly code: string;
  public readonly details: any;
  public readonly timestamp: Date;

  constructor(message: string, code: string = 'TRADE_EXECUTION_ERROR', details?: any) {
    super(message);
    this.name = 'TradeExecutionError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TradeExecutionError);
    }
  }

  /**
   * Convert error to user-friendly message
   */
  toUserMessage(): string {
    switch (this.code) {
      case 'INSUFFICIENT_FUNDS':
        return 'Insufficient buying power for this trade. Please add funds or reduce position size.';
      case 'INVALID_STRATEGY':
        return 'Invalid strategy configuration. Please check your parameters and try again.';
      case 'MARKET_DATA_UNAVAILABLE':
        return 'Market data is currently unavailable. Please try again in a moment.';
      case 'MARGIN_REQUIREMENT_EXCEEDED':
        return 'This trade would exceed your margin requirements. Please reduce position size.';
      case 'OPTION_NOT_FOUND':
        return 'The requested option contract is not available for trading.';
      case 'INVALID_EXPIRY':
        return 'Invalid expiry date. Please select a valid future expiry date.';
      case 'INVALID_STRIKE':
        return 'Invalid strike price. Please enter a positive strike price.';
      case 'VALIDATION_FAILED':
        return `Trade validation failed: ${this.message}`;
      default:
        return `Trade execution failed: ${this.message}`;
    }
  }

  /**
   * Create error from validation failure
   */
  static fromValidation(message: string, details?: any): TradeExecutionError {
    return new TradeExecutionError(message, 'VALIDATION_FAILED', details);
  }

  /**
   * Create error from insufficient funds
   */
  static insufficientFunds(required: number, available: number): TradeExecutionError {
    return new TradeExecutionError(
      `Insufficient funds: Required $${required.toFixed(2)}, Available $${available.toFixed(2)}`,
      'INSUFFICIENT_FUNDS',
      { required, available }
    );
  }

  /**
   * Create error from margin requirement exceeded
   */
  static marginExceeded(margin: number, limit: number): TradeExecutionError {
    return new TradeExecutionError(
      `Margin requirement $${margin.toFixed(2)} exceeds limit $${limit.toFixed(2)}`,
      'MARGIN_REQUIREMENT_EXCEEDED',
      { margin, limit }
    );
  }

  /**
   * Create error from market data unavailable
   */
  static marketDataUnavailable(symbol: string): TradeExecutionError {
    return new TradeExecutionError(
      `Market data unavailable for ${symbol}`,
      'MARKET_DATA_UNAVAILABLE',
      { symbol }
    );
  }

  /**
   * Create error from option not found
   */
  static optionNotFound(symbol: string, optionType: string, strike: number, expiry: string): TradeExecutionError {
    return new TradeExecutionError(
      `Option not found: ${symbol} ${optionType} ${strike} ${expiry}`,
      'OPTION_NOT_FOUND',
      { symbol, optionType, strike, expiry }
    );
  }
}