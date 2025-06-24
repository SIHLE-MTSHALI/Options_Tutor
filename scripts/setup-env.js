#!/usr/bin/env node

/**
 * Environment Setup Script for Options Tutor
 * 
 * This script automatically creates a properly formatted .env file
 * with all necessary environment variables for the Options Tutor application.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Environment variable configurations
const envConfig = {
  // Application Environment
  NODE_ENV: {
    description: 'Application environment',
    default: 'development',
    options: ['development', 'production', 'test'],
    required: true
  },
  
  // Electron Configuration
  ELECTRON_IS_DEV: {
    description: 'Enable Electron development mode',
    default: 'true',
    options: ['true', 'false'],
    required: true
  },
  
  // Alpha Vantage API Configuration
  ALPHA_VANTAGE_API_KEY: {
    description: 'Alpha Vantage API key for market data',
    default: 'demo',
    required: true,
    sensitive: true,
    validation: (value) => {
      if (value === 'demo') return { valid: true, warning: 'Using demo API key - limited functionality' };
      if (!/^[A-Z0-9]{16}$/.test(value)) {
        return { valid: false, error: 'API key should be 16 characters long and contain only uppercase letters and numbers' };
      }
      return { valid: true };
    }
  },
  
  // API Configuration
  API_BASE_URL: {
    description: 'Base URL for API endpoints',
    default: 'https://api.optionstutor.com',
    required: false
  },
  
  // Feature Flags
  ENABLE_REAL_TIME_DATA: {
    description: 'Enable real-time market data fetching',
    default: 'true',
    options: ['true', 'false'],
    required: false
  },
  
  ENABLE_BACKTESTING: {
    description: 'Enable backtesting features',
    default: 'true',
    options: ['true', 'false'],
    required: false
  },
  
  ENABLE_ADVANCED_FEATURES: {
    description: 'Enable advanced trading features',
    default: 'true',
    options: ['true', 'false'],
    required: false
  },
  
  ENABLE_ANALYTICS: {
    description: 'Enable usage analytics (anonymous)',
    default: 'false',
    options: ['true', 'false'],
    required: false
  },
  
  // Debug and Logging
  DEBUG: {
    description: 'Debug namespace patterns (comma-separated)',
    default: 'options-tutor:*',
    required: false
  },
  
  LOG_LEVEL: {
    description: 'Application log level',
    default: 'info',
    options: ['error', 'warn', 'info', 'debug', 'trace'],
    required: false
  },
  
  // Data Storage
  DATA_STORAGE_PATH: {
    description: 'Custom path for data storage (optional)',
    default: '',
    required: false
  },
  
  // Performance Settings
  MAX_CONCURRENT_REQUESTS: {
    description: 'Maximum concurrent API requests',
    default: '5',
    required: false,
    validation: (value) => {
      const num = parseInt(value);
      if (isNaN(num) || num < 1 || num > 10) {
        return { valid: false, error: 'Must be a number between 1 and 10' };
      }
      return { valid: true };
    }
  },
  
  REQUEST_TIMEOUT: {
    description: 'API request timeout in milliseconds',
    default: '30000',
    required: false,
    validation: (value) => {
      const num = parseInt(value);
      if (isNaN(num) || num < 5000 || num > 120000) {
        return { valid: false, error: 'Must be a number between 5000 and 120000' };
      }
      return { valid: true };
    }
  },
  
  // Security Settings
  ENABLE_SECURITY_HEADERS: {
    description: 'Enable security headers',
    default: 'true',
    options: ['true', 'false'],
    required: false
  },
  
  // Development Settings
  HOT_RELOAD: {
    description: 'Enable hot reload in development',
    default: 'true',
    options: ['true', 'false'],
    required: false
  },
  
  OPEN_DEVTOOLS: {
    description: 'Open DevTools on startup (development only)',
    default: 'false',
    options: ['true', 'false'],
    required: false
  }
};

class EnvSetup {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.envPath = path.join(process.cwd(), '.env');
    this.envValues = {};
  }

  // Utility methods for colored output
  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  logHeader(message) {
    console.log(`\n${colors.bright}${colors.blue}=== ${message} ===${colors.reset}\n`);
  }

  logSuccess(message) {
    this.log(`✓ ${message}`, 'green');
  }

  logWarning(message) {
    this.log(`⚠ ${message}`, 'yellow');
  }

  logError(message) {
    this.log(`✗ ${message}`, 'red');
  }

  // Check if .env file already exists
  checkExistingEnv() {
    if (fs.existsSync(this.envPath)) {
      this.logWarning('.env file already exists');
      return true;
    }
    return false;
  }

  // Load existing .env file
  loadExistingEnv() {
    try {
      const content = fs.readFileSync(this.envPath, 'utf8');
      const lines = content.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            this.envValues[key.trim()] = valueParts.join('=').trim();
          }
        }
      }
      
      this.logSuccess(`Loaded ${Object.keys(this.envValues).length} existing environment variables`);
    } catch (error) {
      this.logError(`Error loading existing .env file: ${error.message}`);
    }
  }

  // Prompt user for input
  async prompt(question, defaultValue = '') {
    return new Promise((resolve) => {
      const promptText = defaultValue 
        ? `${question} (${colors.cyan}${defaultValue}${colors.reset}): `
        : `${question}: `;
      
      this.rl.question(promptText, (answer) => {
        resolve(answer.trim() || defaultValue);
      });
    });
  }

  // Prompt for yes/no confirmation
  async confirmPrompt(question, defaultValue = 'y') {
    const answer = await this.prompt(`${question} (y/n)`, defaultValue);
    return answer.toLowerCase().startsWith('y');
  }

  // Validate environment variable value
  validateValue(key, value, config) {
    if (config.validation) {
      return config.validation(value);
    }
    
    if (config.options && !config.options.includes(value)) {
      return {
        valid: false,
        error: `Must be one of: ${config.options.join(', ')}`
      };
    }
    
    return { valid: true };
  }

  // Setup Alpha Vantage API key with special handling
  async setupAlphaVantageKey() {
    this.logHeader('Alpha Vantage API Key Setup');
    
    console.log('Alpha Vantage provides free market data with the following limits:');
    console.log('• 25 requests per day (our conservative limit)');
    console.log('• 5 requests per minute');
    console.log('• Real-time and historical stock data');
    console.log('');
    console.log('To get a free API key:');
    console.log('1. Visit: https://www.alphavantage.co/support/#api-key');
    console.log('2. Enter your email address');
    console.log('3. Copy the API key you receive');
    console.log('');
    
    const hasKey = await this.confirmPrompt('Do you have an Alpha Vantage API key?', 'n');
    
    if (hasKey) {
      let apiKey;
      let isValid = false;
      
      while (!isValid) {
        apiKey = await this.prompt('Enter your Alpha Vantage API key');
        
        if (!apiKey) {
          this.logWarning('API key cannot be empty');
          continue;
        }
        
        const validation = this.validateValue('ALPHA_VANTAGE_API_KEY', apiKey, envConfig.ALPHA_VANTAGE_API_KEY);
        
        if (validation.valid) {
          isValid = true;
          if (validation.warning) {
            this.logWarning(validation.warning);
          }
        } else {
          this.logError(validation.error);
        }
      }
      
      this.envValues.ALPHA_VANTAGE_API_KEY = apiKey;
      this.logSuccess('Alpha Vantage API key configured');
    } else {
      this.logWarning('Using demo API key - you will have limited functionality');
      this.envValues.ALPHA_VANTAGE_API_KEY = 'demo';
    }
  }

  // Setup environment variables interactively
  async setupInteractive() {
    this.logHeader('Interactive Environment Setup');
    
    // Special handling for Alpha Vantage API key
    await this.setupAlphaVantageKey();
    
    // Setup other environment variables
    for (const [key, config] of Object.entries(envConfig)) {
      if (key === 'ALPHA_VANTAGE_API_KEY') continue; // Already handled
      
      console.log(`\n${colors.bright}${key}${colors.reset}`);
      console.log(`Description: ${config.description}`);
      
      if (config.options) {
        console.log(`Options: ${config.options.join(', ')}`);
      }
      
      const currentValue = this.envValues[key];
      const defaultValue = currentValue || config.default;
      
      let value;
      let isValid = false;
      
      while (!isValid) {
        if (config.sensitive && currentValue) {
          value = await this.prompt(`Enter new value (current: ***hidden***)`, '');
          if (!value) value = currentValue;
        } else {
          value = await this.prompt('Enter value', defaultValue);
        }
        
        if (!value && config.required) {
          this.logError('This field is required');
          continue;
        }
        
        if (value) {
          const validation = this.validateValue(key, value, config);
          
          if (validation.valid) {
            isValid = true;
            if (validation.warning) {
              this.logWarning(validation.warning);
            }
          } else {
            this.logError(validation.error);
          }
        } else {
          isValid = true; // Optional field left empty
        }
      }
      
      if (value) {
        this.envValues[key] = value;
      }
    }
  }

  // Setup with default values
  setupDefaults() {
    this.logHeader('Setting up with default values');
    
    for (const [key, config] of Object.entries(envConfig)) {
      if (!this.envValues[key] && config.default) {
        this.envValues[key] = config.default;
      }
    }
    
    this.logSuccess('Default values configured');
  }

  // Generate .env file content
  generateEnvContent() {
    const lines = [];
    
    // Add header comment
    lines.push('# Options Tutor Environment Configuration');
    lines.push('# Generated by setup-env.js script');
    lines.push(`# Created: ${new Date().toISOString()}`);
    lines.push('');
    
    // Group variables by category
    const categories = {
      'Application Environment': ['NODE_ENV', 'ELECTRON_IS_DEV'],
      'API Configuration': ['ALPHA_VANTAGE_API_KEY', 'API_BASE_URL'],
      'Feature Flags': ['ENABLE_REAL_TIME_DATA', 'ENABLE_BACKTESTING', 'ENABLE_ADVANCED_FEATURES', 'ENABLE_ANALYTICS'],
      'Debug and Logging': ['DEBUG', 'LOG_LEVEL'],
      'Data Storage': ['DATA_STORAGE_PATH'],
      'Performance Settings': ['MAX_CONCURRENT_REQUESTS', 'REQUEST_TIMEOUT'],
      'Security Settings': ['ENABLE_SECURITY_HEADERS'],
      'Development Settings': ['HOT_RELOAD', 'OPEN_DEVTOOLS']
    };
    
    for (const [category, keys] of Object.entries(categories)) {
      lines.push(`# ${category}`);
      
      for (const key of keys) {
        const config = envConfig[key];
        const value = this.envValues[key];
        
        if (value !== undefined) {
          lines.push(`# ${config.description}`);
          if (config.options) {
            lines.push(`# Options: ${config.options.join(', ')}`);
          }
          lines.push(`${key}=${value}`);
          lines.push('');
        }
      }
    }
    
    return lines.join('\n');
  }

  // Write .env file
  writeEnvFile() {
    try {
      const content = this.generateEnvContent();
      fs.writeFileSync(this.envPath, content, 'utf8');
      this.logSuccess('.env file created successfully');
      return true;
    } catch (error) {
      this.logError(`Error writing .env file: ${error.message}`);
      return false;
    }
  }

  // Create backup of existing .env file
  createBackup() {
    try {
      const backupPath = `${this.envPath}.backup.${Date.now()}`;
      fs.copyFileSync(this.envPath, backupPath);
      this.logSuccess(`Backup created: ${path.basename(backupPath)}`);
      return true;
    } catch (error) {
      this.logError(`Error creating backup: ${error.message}`);
      return false;
    }
  }

  // Display summary
  displaySummary() {
    this.logHeader('Environment Setup Summary');
    
    console.log('Configured environment variables:');
    for (const [key, value] of Object.entries(this.envValues)) {
      const config = envConfig[key];
      if (config && config.sensitive) {
        console.log(`  ${key}=***hidden***`);
      } else {
        console.log(`  ${key}=${value}`);
      }
    }
    
    console.log('\nNext steps:');
    console.log('1. Review the generated .env file');
    console.log('2. Restart the application to apply changes');
    console.log('3. Test the Alpha Vantage API connection');
    
    if (this.envValues.ALPHA_VANTAGE_API_KEY === 'demo') {
      console.log('\n⚠ Note: You are using the demo API key.');
      console.log('   Get a free API key from https://www.alphavantage.co/support/#api-key');
      console.log('   for full functionality.');
    }
  }

  // Main setup flow
  async run() {
    try {
      console.log(`${colors.bright}${colors.blue}`);
      console.log('╔══════════════════════════════════════════════════════════════╗');
      console.log('║                    Options Tutor                            ║');
      console.log('║                Environment Setup Script                     ║');
      console.log('╚══════════════════════════════════════════════════════════════╝');
      console.log(colors.reset);
      
      const existingEnv = this.checkExistingEnv();
      
      if (existingEnv) {
        this.loadExistingEnv();
        
        const overwrite = await this.confirmPrompt('Do you want to update the existing .env file?', 'y');
        if (!overwrite) {
          this.log('Setup cancelled by user', 'yellow');
          this.rl.close();
          return;
        }
        
        this.createBackup();
      }
      
      const interactive = await this.confirmPrompt('Do you want to configure environment variables interactively?', 'y');
      
      if (interactive) {
        await this.setupInteractive();
      } else {
        this.setupDefaults();
      }
      
      const success = this.writeEnvFile();
      
      if (success) {
        this.displaySummary();
      }
      
    } catch (error) {
      this.logError(`Setup failed: ${error.message}`);
    } finally {
      this.rl.close();
    }
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  const setup = new EnvSetup();
  setup.run().catch(console.error);
}

module.exports = EnvSetup;