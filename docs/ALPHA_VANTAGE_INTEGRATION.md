# Alpha Vantage Integration Guide

This guide covers the complete Alpha Vantage integration in Options Tutor, including setup, configuration, data management, and best practices for staying within API limits.

## Table of Contents

1. [Overview](#overview)
2. [API Key Setup](#api-key-setup)
3. [Rate Limiting Strategy](#rate-limiting-strategy)
4. [Data Storage System](#data-storage-system)
5. [Automated Data Fetching](#automated-data-fetching)
6. [Manual Data Management](#manual-data-management)
7. [Configuration Options](#configuration-options)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

## Overview

Options Tutor integrates with Alpha Vantage to provide real-time and historical market data while respecting API limits and ensuring reliable operation. The integration includes:

- **Conservative Rate Limiting**: 25 requests/day (well under the 500/day limit)
- **Data Persistence**: All data stored locally for offline access
- **Automated Fetching**: Twice-daily data updates
- **Fallback System**: Mock data when API limits are reached
- **Comprehensive Monitoring**: Detailed status and analytics

### Key Features

- ✅ **Free Tier Friendly**: Designed for Alpha Vantage free accounts
- ✅ **Offline Capable**: Works without internet after initial data fetch
- ✅ **Rate Limit Aware**: Never exceeds API quotas
- ✅ **Automatic Updates**: Scheduled data refreshes
- ✅ **Manual Control**: Force refresh specific symbols when needed

## API Key Setup

### Getting Your Free API Key

1. **Visit Alpha Vantage**: Go to https://www.alphavantage.co/support/#api-key
2. **Enter Email**: Provide your email address
3. **Get Key**: Copy the 16-character API key you receive
4. **Configure Options Tutor**: Use the setup script or manual configuration

### Automated Setup (Recommended)

```bash
# Run the interactive setup script
npm run setup-env
```

The script will:
- Guide you through API key entry
- Validate the key format
- Configure all environment variables
- Create a properly formatted .env file

### Manual Setup

1. **Copy Environment Template**:
   ```bash
   cp .env.example .env
   ```

2. **Edit .env File**:
   ```bash
   # Replace 'demo' with your actual API key
   ALPHA_VANTAGE_API_KEY=YOUR_16_CHARACTER_KEY
   ```

3. **Verify Configuration**:
   ```bash
   npm run data:status service
   ```

### Demo Mode

If you don't have an API key, Options Tutor will run in demo mode:
- Uses mock data for all symbols
- No API requests made
- Limited functionality
- Good for testing and development

## Rate Limiting Strategy

### Conservative Approach

Options Tutor uses a conservative rate limiting strategy to ensure reliable operation:

- **Daily Limit**: 25 requests (vs 500 allowed)
- **Request Spacing**: 12 seconds between requests
- **Request Types**: Quotes, historical data, company info
- **Retry Logic**: 3 attempts with exponential backoff

### Rate Limit Monitoring

```bash
# Check current rate limit status
npm run data:status service
```

Output includes:
- Requests used today
- Requests remaining
- Next available request time
- Can make request status

### Rate Limit Handling

When rate limits are reached:
1. **Return Cached Data**: Use stored data if available
2. **Mock Data Fallback**: Generate realistic mock data
3. **Queue Requests**: Defer requests to next available time
4. **User Notification**: Display rate limit status in UI

## Data Storage System

### Storage Location

Data is stored in the user's application data directory:

- **Windows**: `%APPDATA%\Options Tutor\market-data\`
- **macOS**: `~/Library/Application Support/Options Tutor/market-data/`
- **Linux**: `~/.config/options-tutor/market-data/`

### Data Structure

```json
{
  "quotes": {
    "AAPL": {
      "symbol": "AAPL",
      "price": 150.25,
      "change": 2.15,
      "changePercent": 1.45,
      "volume": 45123456,
      "refreshedAt": 1704067200000,
      "lastFetchAt": 1704067200000
    }
  },
  "historical": {
    "AAPL": {
      "symbol": "AAPL",
      "data": [
        {
          "date": "2024-01-01",
          "open": 148.10,
          "high": 151.20,
          "low": 147.85,
          "close": 150.25,
          "volume": 45123456
        }
      ],
      "refreshedAt": 1704067200000
    }
  },
  "company": {
    "AAPL": {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "description": "Technology company...",
      "sector": "Technology",
      "industry": "Consumer Electronics",
      "marketCap": 3000000000000,
      "peRatio": 25.5,
      "dividendYield": 0.5,
      "refreshedAt": 1704067200000
    }
  },
  "metadata": {
    "lastUpdate": 1704067200000,
    "requestsToday": 15,
    "lastRequestDate": "Mon Jan 01 2024"
  }
}
```

### Data Management Commands

```bash
# View storage statistics
npm run data:status data

# Export data for backup
npm run data:fetch export

# Clear all stored data
npm run data:fetch clear

# Cleanup old data (>7 days)
npm run data:fetch cleanup
```

## Automated Data Fetching

### Scheduling System

The DataSchedulerService manages automated data fetching:

- **Frequency**: Twice daily (9:30 AM and 3:30 PM EST)
- **Symbols**: Configurable list of watched symbols
- **Data Types**: Quotes, historical data, company information
- **Retry Logic**: Automatic retry on failures

### Default Schedule

```javascript
{
  enabled: true,
  fetchTimes: ['09:30', '15:30'], // Market open and close
  symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'MSTY', 'NVDA', 'META', 'SPY', 'QQQ'],
  maxDailyRequests: 25,
  retryAttempts: 3,
  retryDelay: 60000 // 1 minute
}
```

### Monitoring Automated Fetching

```bash
# Check scheduler status
npm run data:status

# View detailed job information
npm run data:fetch status
```

### Customizing the Schedule

The schedule can be customized through environment variables or programmatically:

```bash
# Environment variables
FETCH_TIMES=09:30,12:00,15:30
WATCHED_SYMBOLS=AAPL,MSFT,GOOGL,TSLA
MAX_DAILY_REQUESTS=20
```

## Manual Data Management

### Command Line Tools

#### Data Status Tool

```bash
# Complete status report
npm run data:status

# Service status only
npm run data:status service

# Data storage status only
npm run data:status data

# Detailed per-symbol analysis
npm run data:status detailed

# Data integrity check
npm run data:status integrity

# Summary report
npm run data:status report
```

#### Data Fetch Tool

```bash
# Fetch all watched symbols
npm run data:fetch all

# Fetch specific symbol
npm run data:fetch symbol AAPL

# Check service status
npm run data:fetch status

# Cleanup old data
npm run data:fetch cleanup

# Clear all data
npm run data:fetch clear
```

### Programmatic Access

```typescript
import { AlphaVantageService } from './services/AlphaVantageService';

const service = AlphaVantageService.getInstance();

// Get quote data
const quote = await service.getDetailedStockQuote('AAPL');

// Get company information
const company = service.getCompanyOverview('AAPL');

// Get historical data
const historical = service.getHistoricalData('AAPL');

// Check rate limits
const rateStatus = service.getRateLimitStatus();

// Force refresh specific symbol
await service.forceRefresh('AAPL');
```

## Configuration Options

### Environment Variables

```bash
# Alpha Vantage Configuration
ALPHA_VANTAGE_API_KEY=your_api_key_here

# Data Fetching
ENABLE_REAL_TIME_DATA=true
MAX_CONCURRENT_REQUESTS=5
REQUEST_TIMEOUT=30000

# Scheduling
FETCH_TIMES=09:30,15:30
WATCHED_SYMBOLS=AAPL,MSFT,GOOGL
MAX_DAILY_REQUESTS=25

# Storage
DATA_STORAGE_PATH=/custom/path/to/data
```

### Runtime Configuration

```typescript
// Update watched symbols
service.addWatchedSymbol('NVDA');
service.removeWatchedSymbol('META');

// Update scheduler configuration
scheduler.updateConfig({
  fetchTimes: ['09:30', '12:00', '15:30'],
  maxDailyRequests: 20
});

// Enable/disable scheduler
scheduler.setEnabled(false);
```

## Troubleshooting

### Common Issues

#### API Key Problems

**Issue**: "Invalid API key" error
**Solution**:
1. Verify API key is exactly 16 characters
2. Check for extra spaces or characters
3. Ensure key is active (check Alpha Vantage email)
4. Re-run setup: `npm run setup-env`

#### Rate Limit Exceeded

**Issue**: "Rate limit exceeded" error
**Solution**:
1. Check daily usage: `npm run data:status service`
2. Wait for next day or reduce fetch frequency
3. Use stored data: `npm run data:status data`
4. Consider upgrading Alpha Vantage plan

#### No Data Available

**Issue**: No market data showing in app
**Solution**:
1. Check API key configuration
2. Verify internet connection
3. Force fetch data: `npm run data:fetch all`
4. Check for API service outages

#### Stale Data

**Issue**: Data is outdated
**Solution**:
1. Check last update time: `npm run data:status`
2. Force refresh: `npm run data:fetch all`
3. Verify scheduler is running
4. Check rate limit status

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
# Set debug environment variable
DEBUG=options-tutor:* npm start

# Or in .env file
DEBUG=options-tutor:alpha-vantage,options-tutor:scheduler
```

### Log Files

Check application logs for detailed error information:

- **Windows**: `%APPDATA%\Options Tutor\logs\`
- **macOS**: `~/Library/Logs/Options Tutor/`
- **Linux**: `~/.config/options-tutor/logs/`

## Best Practices

### API Usage

1. **Monitor Usage**: Regularly check rate limit status
2. **Conservative Limits**: Stay well under daily quotas
3. **Batch Requests**: Group related data requests
4. **Cache Aggressively**: Use stored data when possible
5. **Graceful Degradation**: Handle API failures gracefully

### Data Management

1. **Regular Cleanup**: Remove old data periodically
2. **Backup Data**: Export important data regularly
3. **Monitor Storage**: Check storage size and growth
4. **Validate Data**: Verify data integrity regularly

### Performance

1. **Async Operations**: Use non-blocking data fetching
2. **Background Updates**: Fetch data in background
3. **Efficient Storage**: Optimize data structure size
4. **Memory Management**: Clean up unused data

### Security

1. **Secure API Keys**: Never commit API keys to version control
2. **Environment Variables**: Use .env files for configuration
3. **Input Validation**: Validate all user inputs
4. **Error Handling**: Don't expose sensitive information in errors

### Monitoring

1. **Regular Status Checks**: Monitor service health
2. **Usage Analytics**: Track API usage patterns
3. **Performance Metrics**: Monitor response times
4. **Error Tracking**: Log and analyze errors

## Advanced Configuration

### Custom Data Sources

While Alpha Vantage is the primary data source, the architecture supports additional providers:

```typescript
// Example: Add custom data provider
class CustomDataProvider {
  async getQuote(symbol: string) {
    // Custom implementation
  }
}
```

### Data Transformation

Customize how data is processed and stored:

```typescript
// Example: Custom data transformer
class DataTransformer {
  transformQuote(rawData: any): StockQuote {
    // Custom transformation logic
  }
}
```

### Integration with Trading Systems

Connect to external trading platforms:

```typescript
// Example: Trading platform integration
class TradingPlatformConnector {
  async syncPositions() {
    // Sync with external platform
  }
}
```

## Support and Resources

### Getting Help

1. **Documentation**: Check this guide and API reference
2. **Status Tools**: Use built-in diagnostic tools
3. **Community**: Join discussions and forums
4. **Support**: Contact support for critical issues

### Useful Links

- **Alpha Vantage Documentation**: https://www.alphavantage.co/documentation/
- **API Key Registration**: https://www.alphavantage.co/support/#api-key
- **Rate Limits**: https://www.alphavantage.co/support/#support
- **Status Page**: https://status.alphavantage.co/

### Contributing

Help improve the Alpha Vantage integration:

1. **Report Issues**: Submit bug reports and feature requests
2. **Contribute Code**: Submit pull requests for improvements
3. **Documentation**: Help improve this guide
4. **Testing**: Test with different configurations and scenarios

---

*This integration guide is regularly updated. For the latest information, check the repository documentation.*