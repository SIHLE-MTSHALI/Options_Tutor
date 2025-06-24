#!/usr/bin/env node

/**
 * Manual Data Fetch Script
 * 
 * Allows manual fetching of market data from Alpha Vantage
 * Useful for testing and one-off data updates
 */

const path = require('path');
const fs = require('fs');

// Mock Electron app for Node.js environment
global.app = {
  getPath: (name) => {
    if (name === 'userData') {
      return path.join(process.cwd(), 'data');
    }
    return process.cwd();
  }
};

// Import services (need to set up path for ES modules)
const { AlphaVantageService } = require('../src/services/AlphaVantageService');

class DataFetcher {
  constructor() {
    this.alphaVantageService = AlphaVantageService.getInstance();
  }

  async fetchSymbol(symbol) {
    console.log(`\n📊 Fetching data for ${symbol}...`);
    
    try {
      // Check rate limits
      const status = this.alphaVantageService.getRateLimitStatus();
      console.log(`Rate limit status: ${status.requestsRemaining} requests remaining`);
      
      if (!status.canMakeRequest) {
        console.log('❌ Rate limit exceeded, cannot fetch data');
        return false;
      }

      // Fetch data
      const quote = await this.alphaVantageService.getDetailedStockQuote(symbol);
      console.log(`✅ Quote: $${quote.price} (${quote.change >= 0 ? '+' : ''}${quote.change.toFixed(2)})`);
      
      const company = this.alphaVantageService.getCompanyOverview(symbol);
      if (company) {
        console.log(`✅ Company: ${company.name} (${company.sector})`);
      }
      
      const historical = this.alphaVantageService.getHistoricalData(symbol);
      if (historical) {
        console.log(`✅ Historical: ${historical.data.length} data points`);
      }
      
      return true;
      
    } catch (error) {
      console.log(`❌ Error fetching ${symbol}: ${error.message}`);
      return false;
    }
  }

  async fetchAll() {
    console.log('🚀 Starting bulk data fetch...');
    
    const symbols = this.alphaVantageService.getWatchedSymbols();
    console.log(`Symbols to fetch: ${symbols.join(', ')}`);
    
    let successful = 0;
    let failed = 0;
    
    for (const symbol of symbols) {
      const success = await this.fetchSymbol(symbol);
      if (success) {
        successful++;
      } else {
        failed++;
      }
      
      // Wait between requests
      if (symbols.indexOf(symbol) < symbols.length - 1) {
        console.log('⏳ Waiting 12 seconds for rate limit...');
        await this.delay(12000);
      }
    }
    
    console.log(`\n📈 Fetch completed: ${successful} successful, ${failed} failed`);
    
    // Display storage stats
    const stats = this.alphaVantageService.getStorageStats();
    console.log(`\n📊 Storage Statistics:`);
    console.log(`  Quotes: ${stats.quotesCount}`);
    console.log(`  Historical: ${stats.historicalCount}`);
    console.log(`  Company: ${stats.companyCount}`);
    console.log(`  Total size: ${(stats.totalSize / 1024).toFixed(1)} KB`);
    console.log(`  Last update: ${new Date(stats.lastUpdate).toLocaleString()}`);
  }

  async status() {
    console.log('📊 Alpha Vantage Service Status\n');
    
    // API Key status
    const apiStatus = this.alphaVantageService.getApiKeyStatus();
    console.log(`API Key: ${apiStatus.hasKey ? '✅ Configured' : '❌ Missing'} ${apiStatus.isDemo ? '(Demo)' : ''}`);
    
    // Rate limit status
    const rateStatus = this.alphaVantageService.getRateLimitStatus();
    console.log(`Rate Limit: ${rateStatus.requestsRemaining}/${25} requests remaining today`);
    
    // Data freshness
    const freshness = this.alphaVantageService.getDataFreshness();
    console.log(`Data Status: ${freshness.isStale ? '⚠️ Stale' : '✅ Fresh'}`);
    console.log(`Last Update: ${freshness.lastUpdate ? new Date(freshness.lastUpdate).toLocaleString() : 'Never'}`);
    console.log(`Next Update: ${new Date(freshness.nextUpdate).toLocaleString()}`);
    
    // Storage stats
    const stats = this.alphaVantageService.getStorageStats();
    console.log(`\nStored Data:`);
    console.log(`  Quotes: ${stats.quotesCount} symbols`);
    console.log(`  Historical: ${stats.historicalCount} symbols`);
    console.log(`  Company: ${stats.companyCount} symbols`);
    console.log(`  Storage Size: ${(stats.totalSize / 1024).toFixed(1)} KB`);
    
    // Watched symbols
    const watched = this.alphaVantageService.getWatchedSymbols();
    console.log(`\nWatched Symbols: ${watched.join(', ')}`);
    
    // Stored symbols
    const stored = this.alphaVantageService.getStoredSymbols();
    console.log(`Stored Symbols: ${stored.join(', ')}`);
  }

  async cleanup() {
    console.log('🧹 Cleaning up old data...');
    
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    this.alphaVantageService.cleanupOldData(maxAge);
    
    console.log('✅ Cleanup completed');
  }

  async clear() {
    console.log('🗑️ Clearing all stored data...');
    
    this.alphaVantageService.clearStoredData();
    
    console.log('✅ All data cleared');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  printUsage() {
    console.log('Usage: npm run data:fetch [command] [symbol]');
    console.log('');
    console.log('Commands:');
    console.log('  status          Show service status and statistics');
    console.log('  all             Fetch data for all watched symbols');
    console.log('  symbol <SYM>    Fetch data for specific symbol');
    console.log('  cleanup         Remove old data (>7 days)');
    console.log('  clear           Clear all stored data');
    console.log('');
    console.log('Examples:');
    console.log('  npm run data:fetch status');
    console.log('  npm run data:fetch all');
    console.log('  npm run data:fetch symbol AAPL');
    console.log('  npm run data:fetch cleanup');
  }
}

async function main() {
  const fetcher = new DataFetcher();
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    fetcher.printUsage();
    return;
  }
  
  const command = args[0].toLowerCase();
  
  try {
    switch (command) {
      case 'status':
        await fetcher.status();
        break;
        
      case 'all':
        await fetcher.fetchAll();
        break;
        
      case 'symbol':
        if (args.length < 2) {
          console.log('❌ Please specify a symbol');
          return;
        }
        await fetcher.fetchSymbol(args[1].toUpperCase());
        break;
        
      case 'cleanup':
        await fetcher.cleanup();
        break;
        
      case 'clear':
        await fetcher.clear();
        break;
        
      default:
        console.log(`❌ Unknown command: ${command}`);
        fetcher.printUsage();
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = DataFetcher;