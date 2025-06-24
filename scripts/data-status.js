#!/usr/bin/env node

/**
 * Data Status Script
 * 
 * Provides detailed status information about stored market data
 * and Alpha Vantage service configuration
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

const { AlphaVantageService } = require('../src/services/AlphaVantageService');

class DataStatusChecker {
  constructor() {
    this.alphaVantageService = AlphaVantageService.getInstance();
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatTime(timestamp) {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  }

  formatDuration(ms) {
    if (!ms) return 'N/A';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  async checkServiceStatus() {
    console.log('🔍 Alpha Vantage Service Status');
    console.log('═'.repeat(50));
    
    // API Configuration
    const apiStatus = this.alphaVantageService.getApiKeyStatus();
    console.log(`\n📡 API Configuration:`);
    console.log(`  API Key: ${apiStatus.hasKey ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`  Mode: ${apiStatus.isDemo ? '🧪 Demo' : '🔑 Production'}`);
    
    if (apiStatus.isDemo) {
      console.log(`  ⚠️  Demo mode has limited functionality`);
      console.log(`  💡 Get a free API key: https://www.alphavantage.co/support/#api-key`);
    }
    
    // Rate Limiting
    const rateStatus = this.alphaVantageService.getRateLimitStatus();
    console.log(`\n⏱️  Rate Limiting:`);
    console.log(`  Daily Limit: 25 requests`);
    console.log(`  Used Today: ${rateStatus.requestsToday}`);
    console.log(`  Remaining: ${rateStatus.requestsRemaining}`);
    console.log(`  Can Make Request: ${rateStatus.canMakeRequest ? '✅ Yes' : '❌ No'}`);
    
    if (!rateStatus.canMakeRequest) {
      const resetTime = new Date(rateStatus.nextRequestTime);
      console.log(`  Next Request: ${resetTime.toLocaleString()}`);
    }
    
    // Service Availability
    console.log(`\n🌐 Service Availability:`);
    try {
      const isAvailable = await this.alphaVantageService.isAvailable();
      console.log(`  Status: ${isAvailable ? '✅ Available' : '❌ Unavailable'}`);
    } catch (error) {
      console.log(`  Status: ❌ Error - ${error.message}`);
    }
  }

  checkDataStatus() {
    console.log('\n📊 Data Storage Status');
    console.log('═'.repeat(50));
    
    // Storage Statistics
    const stats = this.alphaVantageService.getStorageStats();
    console.log(`\n💾 Storage Statistics:`);
    console.log(`  Quotes: ${stats.quotesCount} symbols`);
    console.log(`  Historical Data: ${stats.historicalCount} symbols`);
    console.log(`  Company Info: ${stats.companyCount} symbols`);
    console.log(`  Total Size: ${this.formatBytes(stats.totalSize)}`);
    console.log(`  Last Update: ${this.formatTime(stats.lastUpdate)}`);
    
    // Data Freshness
    const freshness = this.alphaVantageService.getDataFreshness();
    const age = freshness.lastUpdate ? Date.now() - freshness.lastUpdate : 0;
    console.log(`\n🕒 Data Freshness:`);
    console.log(`  Status: ${freshness.isStale ? '⚠️ Stale' : '✅ Fresh'}`);
    console.log(`  Age: ${this.formatDuration(age)}`);
    console.log(`  Next Update: ${this.formatTime(freshness.nextUpdate)}`);
    
    // Symbol Coverage
    const watchedSymbols = this.alphaVantageService.getWatchedSymbols();
    const storedSymbols = this.alphaVantageService.getStoredSymbols();
    
    console.log(`\n📈 Symbol Coverage:`);
    console.log(`  Watched: ${watchedSymbols.length} symbols`);
    console.log(`  Stored: ${storedSymbols.length} symbols`);
    
    const missingSymbols = watchedSymbols.filter(s => !storedSymbols.includes(s));
    const extraSymbols = storedSymbols.filter(s => !watchedSymbols.includes(s));
    
    if (missingSymbols.length > 0) {
      console.log(`  ⚠️  Missing: ${missingSymbols.join(', ')}`);
    }
    
    if (extraSymbols.length > 0) {
      console.log(`  ℹ️  Extra: ${extraSymbols.join(', ')}`);
    }
    
    console.log(`\n📋 Watched Symbols:`);
    console.log(`  ${watchedSymbols.join(', ')}`);
  }

  checkDetailedData() {
    console.log('\n📋 Detailed Data Analysis');
    console.log('═'.repeat(50));
    
    const storedSymbols = this.alphaVantageService.getStoredSymbols();
    
    if (storedSymbols.length === 0) {
      console.log('  No data stored yet');
      return;
    }
    
    console.log(`\n📊 Per-Symbol Analysis:`);
    
    for (const symbol of storedSymbols.sort()) {
      const quote = this.alphaVantageService.getDetailedStockQuote(symbol);
      const company = this.alphaVantageService.getCompanyOverview(symbol);
      const historical = this.alphaVantageService.getHistoricalData(symbol);
      
      console.log(`\n  ${symbol}:`);
      
      if (quote) {
        const age = Date.now() - quote.refreshedAt;
        console.log(`    Quote: $${quote.price.toFixed(2)} (${this.formatDuration(age)} ago)`);
        console.log(`    Change: ${quote.change >= 0 ? '+' : ''}${quote.change.toFixed(2)} (${quote.changePercent.toFixed(2)}%)`);
        console.log(`    Volume: ${quote.volume.toLocaleString()}`);
      } else {
        console.log(`    Quote: ❌ Not available`);
      }
      
      if (company) {
        const age = Date.now() - company.refreshedAt;
        console.log(`    Company: ${company.name} (${this.formatDuration(age)} ago)`);
        console.log(`    Sector: ${company.sector}`);
        console.log(`    Market Cap: $${(company.marketCap / 1e9).toFixed(1)}B`);
      } else {
        console.log(`    Company: ❌ Not available`);
      }
      
      if (historical) {
        const age = Date.now() - historical.refreshedAt;
        console.log(`    Historical: ${historical.data.length} records (${this.formatDuration(age)} ago)`);
        
        if (historical.data.length > 0) {
          const latest = historical.data[0];
          console.log(`    Latest: ${latest.date} - $${latest.close.toFixed(2)}`);
        }
      } else {
        console.log(`    Historical: ❌ Not available`);
      }
    }
  }

  checkDataIntegrity() {
    console.log('\n🔍 Data Integrity Check');
    console.log('═'.repeat(50));
    
    const storedSymbols = this.alphaVantageService.getStoredSymbols();
    let issues = 0;
    
    for (const symbol of storedSymbols) {
      const quote = this.alphaVantageService.getDetailedStockQuote(symbol);
      
      if (quote) {
        // Check for invalid data
        if (isNaN(quote.price) || quote.price <= 0) {
          console.log(`  ❌ ${symbol}: Invalid price (${quote.price})`);
          issues++;
        }
        
        if (isNaN(quote.volume) || quote.volume < 0) {
          console.log(`  ❌ ${symbol}: Invalid volume (${quote.volume})`);
          issues++;
        }
        
        // Check data age
        const age = Date.now() - quote.refreshedAt;
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        
        if (age > maxAge) {
          console.log(`  ⚠️  ${symbol}: Data is very old (${this.formatDuration(age)})`);
          issues++;
        }
      }
    }
    
    if (issues === 0) {
      console.log('  ✅ All data appears to be valid');
    } else {
      console.log(`\n  Found ${issues} potential issues`);
    }
  }

  generateReport() {
    console.log('\n📄 Data Report Summary');
    console.log('═'.repeat(50));
    
    const stats = this.alphaVantageService.getStorageStats();
    const rateStatus = this.alphaVantageService.getRateLimitStatus();
    const freshness = this.alphaVantageService.getDataFreshness();
    const apiStatus = this.alphaVantageService.getApiKeyStatus();
    
    console.log(`\nGenerated: ${new Date().toLocaleString()}`);
    console.log(`API Mode: ${apiStatus.isDemo ? 'Demo' : 'Production'}`);
    console.log(`Data Status: ${freshness.isStale ? 'Stale' : 'Fresh'}`);
    console.log(`API Usage: ${rateStatus.requestsToday}/25 requests today`);
    console.log(`Storage: ${stats.quotesCount} quotes, ${this.formatBytes(stats.totalSize)}`);
    console.log(`Last Update: ${this.formatTime(stats.lastUpdate)}`);
    
    // Recommendations
    console.log(`\n💡 Recommendations:`);
    
    if (apiStatus.isDemo) {
      console.log(`  • Get a free Alpha Vantage API key for full functionality`);
    }
    
    if (freshness.isStale) {
      console.log(`  • Run 'npm run data:fetch all' to update data`);
    }
    
    if (rateStatus.requestsToday >= 20) {
      console.log(`  • Approaching daily rate limit, consider reducing fetch frequency`);
    }
    
    if (stats.totalSize > 1024 * 1024) { // 1MB
      console.log(`  • Consider running 'npm run data:fetch cleanup' to remove old data`);
    }
  }

  printUsage() {
    console.log('Usage: npm run data:status [option]');
    console.log('');
    console.log('Options:');
    console.log('  (none)      Show complete status report');
    console.log('  service     Show service status only');
    console.log('  data        Show data storage status only');
    console.log('  detailed    Show detailed per-symbol analysis');
    console.log('  integrity   Check data integrity');
    console.log('  report      Generate summary report');
    console.log('');
    console.log('Examples:');
    console.log('  npm run data:status');
    console.log('  npm run data:status service');
    console.log('  npm run data:status detailed');
  }
}

async function main() {
  const checker = new DataStatusChecker();
  const args = process.argv.slice(2);
  const option = args[0]?.toLowerCase();
  
  try {
    switch (option) {
      case 'service':
        await checker.checkServiceStatus();
        break;
        
      case 'data':
        checker.checkDataStatus();
        break;
        
      case 'detailed':
        await checker.checkServiceStatus();
        checker.checkDataStatus();
        checker.checkDetailedData();
        break;
        
      case 'integrity':
        checker.checkDataIntegrity();
        break;
        
      case 'report':
        checker.generateReport();
        break;
        
      case 'help':
      case '--help':
      case '-h':
        checker.printUsage();
        break;
        
      case undefined:
        // Default: show everything
        await checker.checkServiceStatus();
        checker.checkDataStatus();
        checker.checkDataIntegrity();
        checker.generateReport();
        break;
        
      default:
        console.log(`❌ Unknown option: ${option}`);
        checker.printUsage();
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = DataStatusChecker;