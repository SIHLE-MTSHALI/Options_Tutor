const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const electronReload = require('electron-reload')

// Load environment variables
require('dotenv').config()

// Only enable hot reload in development
if (process.env.NODE_ENV === 'development') {
  electronReload(__dirname, {
    electron: path.join(__dirname, 'node_modules', '.bin', 'electron')
  });
}

// Import services after app is ready
let AlphaVantageService;
let DataSchedulerService;

function createWindow() {
  const win = new BrowserWindow({
    width: parseInt(process.env.WINDOW_WIDTH) || 1400,
    height: parseInt(process.env.WINDOW_HEIGHT) || 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    },
    icon: path.join(__dirname, 'public', 'icon.png'),
    show: false // Don't show until ready
  })

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    win.loadFile('dist/index.html')
    
    // Open DevTools in development if enabled
    if (process.env.OPEN_DEVTOOLS === 'true') {
      win.webContents.openDevTools()
    }
  } else {
    win.loadFile('dist/index.html')
  }

  // Show window when ready
  win.once('ready-to-show', () => {
    win.show()
    
    // Focus window
    if (process.platform === 'darwin') {
      app.focus()
    } else {
      win.focus()
    }
  })

  // Handle window closed
  win.on('closed', () => {
    // Clean up services
    if (AlphaVantageService) {
      AlphaVantageService.getInstance().stopAutomaticDataFetching()
    }
    if (DataSchedulerService) {
      DataSchedulerService.getInstance().stopScheduler()
    }
  })

  return win
}

// Initialize services
async function initializeServices() {
  try {
    console.log('[Main] Initializing services...')
    
    // Check if we're in development mode
    // If NODE_ENV is not explicitly set, default to development
    const isDevelopment = process.env.NODE_ENV !== 'production';
    console.log(`[Main] Running in ${isDevelopment ? 'development' : 'production'} mode`);
    
    // Define possible paths to try in order of preference
    const paths = isDevelopment 
      ? ['./dist/services', './services', './src/services'] // Development paths
      : ['./dist/services', './services', './src/services']; // Production paths
    
    let loaded = false;
    
    // Try to load AlphaVantageService first
    for (const basePath of paths) {
      try {
        console.log(`[Main] Attempting to load AlphaVantageService from: ${basePath}`);
        const AVService = require(`${basePath}/AlphaVantageService`).AlphaVantageService;
        AlphaVantageService = AVService;
        console.log(`[Main] Successfully loaded AlphaVantageService from ${basePath}`);
        
        // Try to load DataSchedulerService, but make it optional
        try {
          console.log(`[Main] Attempting to load DataSchedulerService from: ${basePath}`);
          const DSService = require(`${basePath}/DataSchedulerService`).DataSchedulerService;
          DataSchedulerService = DSService;
          console.log(`[Main] Successfully loaded DataSchedulerService from ${basePath}`);
        } catch (dsError) {
          console.warn(`[Main] DataSchedulerService not available: ${dsError.message}`);
          console.log('[Main] Continuing without DataSchedulerService');
          // Create a mock DataSchedulerService
          DataSchedulerService = {
            getInstance: () => ({
              getStats: () => ({ status: 'unavailable' }),
              forceImmediateFetch: () => Promise.resolve(false),
              stopScheduler: () => {}
            })
          };
        }
        
        loaded = true;
        break;
      } catch (error) {
        console.log(`[Main] Could not load from ${basePath}:`, error.message);
      }
    }
    
    if (!loaded) {
      throw new Error('Failed to load AlphaVantageService from any available path');
    }
    
    // Initialize Alpha Vantage service
    const alphaVantage = AlphaVantageService.getInstance()
    
    // Set API key from environment
    if (process.env.ALPHA_VANTAGE_API_KEY) {
      alphaVantage.setApiKey(process.env.ALPHA_VANTAGE_API_KEY)
    }
    
    // Initialize data scheduler if real-time data is enabled
    if (process.env.ENABLE_REAL_TIME_DATA === 'true') {
      const scheduler = DataSchedulerService.getInstance()
      console.log('[Main] Data scheduler initialized')
    }
    
    console.log('[Main] Services initialized successfully')
    
  } catch (error) {
    console.error('[Main] Error initializing services:', error)
  }
}

// Set up IPC handlers for renderer communication
function setupIpcHandlers() {
  try {
    // Check if services are available
    if (!AlphaVantageService || !DataSchedulerService) {
      console.warn('[Main] Services not available, setting up minimal IPC handlers');
      
      // Set up error handlers for all expected IPC channels
      const setupErrorHandler = (channel) => {
        ipcMain.handle(channel, async () => {
          throw new Error('Service not available');
        });
      };
      
      // Set up error handlers for all channels
      setupErrorHandler('alpha-vantage:get-quote');
      setupErrorHandler('alpha-vantage:get-rate-limit-status');
      setupErrorHandler('alpha-vantage:get-storage-stats');
      setupErrorHandler('alpha-vantage:force-refresh');
      setupErrorHandler('scheduler:get-stats');
      setupErrorHandler('scheduler:force-fetch');
      
      console.log('[Main] Error IPC handlers set up');
      return;
    }
    
    // Alpha Vantage service handlers
    ipcMain.handle('alpha-vantage:get-quote', async (event, symbol) => {
      try {
        const service = AlphaVantageService.getInstance()
        return await service.getDetailedStockQuote(symbol)
      } catch (error) {
        console.error('IPC Error getting quote:', error)
        throw error
      }
    })

    ipcMain.handle('alpha-vantage:get-rate-limit-status', async () => {
      try {
        const service = AlphaVantageService.getInstance()
        return service.getRateLimitStatus()
      } catch (error) {
        console.error('IPC Error getting rate limit status:', error)
        throw error
      }
    })

    ipcMain.handle('alpha-vantage:get-storage-stats', async () => {
      try {
        const service = AlphaVantageService.getInstance()
        return service.getStorageStats()
      } catch (error) {
        console.error('IPC Error getting storage stats:', error)
        throw error
      }
    })

    ipcMain.handle('alpha-vantage:force-refresh', async (event, symbol) => {
      try {
        const service = AlphaVantageService.getInstance()
        await service.forceRefresh(symbol)
        return true
      } catch (error) {
        console.error('IPC Error force refreshing:', error)
        throw error
      }
    })

    // Data scheduler handlers
    ipcMain.handle('scheduler:get-stats', async () => {
      try {
        const service = DataSchedulerService.getInstance()
        return service.getStats()
      } catch (error) {
        console.error('IPC Error getting scheduler stats:', error)
        throw error
      }
    })

    ipcMain.handle('scheduler:force-fetch', async (event, symbols) => {
      try {
        const service = DataSchedulerService.getInstance()
        await service.forceImmediateFetch(symbols)
        return true
      } catch (error) {
        console.error('IPC Error force fetching:', error)
        throw error
      }
    })

    // Alpha Vantage file system handlers
    const dataPath = path.join(app.getPath('userData'), 'market-data', 'alpha-vantage-data.json');

    ipcMain.handle('alpha-vantage:load-data', async () => {
      try {
        if (fs.existsSync(dataPath)) {
          const data = fs.readFileSync(dataPath, 'utf8');
          return JSON.parse(data);
        }
      } catch (error) {
        console.error('IPC Error loading Alpha Vantage data:', error);
      }
      return null;
    });

    ipcMain.handle('alpha-vantage:save-data', async (event, data) => {
      try {
        fs.mkdirSync(path.dirname(dataPath), { recursive: true });
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
      } catch (error) {
        console.error('IPC Error saving Alpha Vantage data:', error);
      }
    });

    console.log('[Main] IPC handlers set up successfully')
  } catch (error) {
    console.error('[Main] Error setting up IPC handlers:', error);
  }
}

app.whenReady().then(async () => {
  try {
    // Initialize services first
    await initializeServices()
  } catch (error) {
    console.error('[Main] Service initialization failed:', error.message);
    // Continue with app startup even if services fail
  }
  
  // Set up IPC handlers (with error handling inside)
  setupIpcHandlers()
  
  // Create main window
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // Clean up services before quitting
  if (AlphaVantageService) {
    AlphaVantageService.getInstance().stopAutomaticDataFetching()
  }
  if (DataSchedulerService) {
    DataSchedulerService.getInstance().stopScheduler()
  }
  
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  console.log('[Main] Application shutting down...')
  
  // Clean up services
  if (AlphaVantageService) {
    AlphaVantageService.getInstance().stopAutomaticDataFetching()
  }
  if (DataSchedulerService) {
    DataSchedulerService.getInstance().stopScheduler()
  }
})

// Handle certificate errors in development
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (process.env.NODE_ENV === 'development') {
    // In development, ignore certificate errors
    event.preventDefault()
    callback(true)
  } else {
    // In production, use default behavior
    callback(false)
  }
})

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault()
    console.warn('[Security] Blocked new window creation:', navigationUrl)
  })
})

console.log('[Main] Options Tutor starting...')
console.log(`[Main] Environment: ${process.env.NODE_ENV || 'development'}`)
console.log(`[Main] Alpha Vantage API: ${process.env.ALPHA_VANTAGE_API_KEY ? 'Configured' : 'Demo mode'}`)
