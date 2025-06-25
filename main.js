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
    
    // Import services (dynamic import to ensure app is ready)
    let AVService, DSService;
    
    try {
      // Try to import from dist directory (production build)
      AVService = require('./dist/services/AlphaVantageService').AlphaVantageService;
      DSService = require('./dist/services/DataSchedulerService').DataSchedulerService;
    } catch (error) {
      console.log('[Main] Could not load from dist directory, trying src directory...');
      try {
        // Fallback to src directory (development without build)
        AVService = require('./src/services/AlphaVantageService').AlphaVantageService;
        DSService = require('./src/services/DataSchedulerService').DataSchedulerService;
      } catch (fallbackError) {
        console.error('[Main] Failed to import services:', fallbackError);
        throw new Error('Could not load required services. Check build configuration.');
      }
    }
    
    AlphaVantageService = AVService
    DataSchedulerService = DSService
    
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

  console.log('[Main] IPC handlers set up')
}

app.whenReady().then(async () => {
  // Initialize services first
  await initializeServices()
  
  // Set up IPC handlers
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
