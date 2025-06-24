import { AlphaVantageService } from './AlphaVantageService';

/**
 * Data Scheduler Service
 * 
 * Manages automated data fetching from Alpha Vantage API
 * Ensures we stay within API limits while keeping data fresh
 */

interface ScheduleConfig {
  enabled: boolean;
  fetchTimes: string[]; // Times in HH:MM format
  symbols: string[];
  maxDailyRequests: number;
  retryAttempts: number;
  retryDelay: number; // milliseconds
}

interface FetchJob {
  id: string;
  symbol: string;
  type: 'quote' | 'historical' | 'company';
  scheduledTime: number;
  attempts: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
}

interface SchedulerStats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  pendingJobs: number;
  requestsToday: number;
  nextScheduledFetch: number;
  lastSuccessfulFetch: number;
}

export class DataSchedulerService {
  private static instance: DataSchedulerService;
  private alphaVantageService: AlphaVantageService;
  private config: ScheduleConfig;
  private jobs: FetchJob[] = [];
  private isRunning = false;
  private schedulerInterval: NodeJS.Timeout | null = null;
  private jobQueue: FetchJob[] = [];

  private constructor() {
    this.alphaVantageService = AlphaVantageService.getInstance();
    this.config = this.getDefaultConfig();
    this.initializeScheduler();
  }

  public static getInstance(): DataSchedulerService {
    if (!DataSchedulerService.instance) {
      DataSchedulerService.instance = new DataSchedulerService();
    }
    return DataSchedulerService.instance;
  }

  /**
   * Get default scheduler configuration
   */
  private getDefaultConfig(): ScheduleConfig {
    return {
      enabled: true,
      fetchTimes: ['09:30', '15:30'], // Market open and close times (EST)
      symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'MSTY', 'NVDA', 'META', 'SPY', 'QQQ'],
      maxDailyRequests: 25, // Conservative limit
      retryAttempts: 3,
      retryDelay: 60000 // 1 minute
    };
  }

  /**
   * Initialize the scheduler
   */
  private initializeScheduler(): void {
    // Check every minute for scheduled jobs
    this.schedulerInterval = setInterval(() => {
      this.checkScheduledJobs();
    }, 60000);

    // Schedule initial jobs
    this.scheduleNextFetch();

    console.log('[DataScheduler] Scheduler initialized');
  }

  /**
   * Stop the scheduler
   */
  public stopScheduler(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
    this.isRunning = false;
    console.log('[DataScheduler] Scheduler stopped');
  }

  /**
   * Start the scheduler
   */
  public startScheduler(): void {
    if (!this.schedulerInterval) {
      this.initializeScheduler();
    }
    console.log('[DataScheduler] Scheduler started');
  }

  /**
   * Update scheduler configuration
   */
  public updateConfig(newConfig: Partial<ScheduleConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Reschedule if symbols or times changed
    if (newConfig.symbols || newConfig.fetchTimes) {
      this.scheduleNextFetch();
    }
    
    console.log('[DataScheduler] Configuration updated');
  }

  /**
   * Get current configuration
   */
  public getConfig(): ScheduleConfig {
    return { ...this.config };
  }

  /**
   * Schedule next fetch based on configured times
   */
  private scheduleNextFetch(): void {
    if (!this.config.enabled) {
      return;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    // Find next scheduled time
    let nextFetchTime: Date | null = null;

    for (const timeStr of this.config.fetchTimes) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const scheduledTime = new Date(today.getTime());
      scheduledTime.setHours(hours, minutes, 0, 0);

      // If time has passed today, schedule for tomorrow
      if (scheduledTime.getTime() <= now.getTime()) {
        scheduledTime.setTime(tomorrow.getTime());
        scheduledTime.setHours(hours, minutes, 0, 0);
      }

      if (!nextFetchTime || scheduledTime.getTime() < nextFetchTime.getTime()) {
        nextFetchTime = scheduledTime;
      }
    }

    if (nextFetchTime) {
      this.scheduleDataFetch(nextFetchTime.getTime());
      console.log(`[DataScheduler] Next fetch scheduled for ${nextFetchTime.toLocaleString()}`);
    }
  }

  /**
   * Schedule a data fetch at specific time
   */
  private scheduleDataFetch(scheduledTime: number): void {
    // Clear existing pending jobs for the same time
    this.jobs = this.jobs.filter(job => 
      job.scheduledTime !== scheduledTime || job.status !== 'pending'
    );

    // Create jobs for each symbol and data type
    for (const symbol of this.config.symbols) {
      // Quote job
      this.jobs.push({
        id: `quote-${symbol}-${scheduledTime}`,
        symbol,
        type: 'quote',
        scheduledTime,
        attempts: 0,
        status: 'pending'
      });

      // Historical data job
      this.jobs.push({
        id: `historical-${symbol}-${scheduledTime}`,
        symbol,
        type: 'historical',
        scheduledTime,
        attempts: 0,
        status: 'pending'
      });

      // Company overview job (less frequent)
      const shouldFetchCompany = Math.random() < 0.3; // 30% chance
      if (shouldFetchCompany) {
        this.jobs.push({
          id: `company-${symbol}-${scheduledTime}`,
          symbol,
          type: 'company',
          scheduledTime,
          attempts: 0,
          status: 'pending'
        });
      }
    }

    console.log(`[DataScheduler] Scheduled ${this.jobs.filter(j => j.scheduledTime === scheduledTime).length} jobs`);
  }

  /**
   * Check for jobs that should be executed
   */
  private checkScheduledJobs(): void {
    if (this.isRunning) {
      return; // Already processing jobs
    }

    const now = Date.now();
    const readyJobs = this.jobs.filter(job => 
      job.status === 'pending' && job.scheduledTime <= now
    );

    if (readyJobs.length > 0) {
      this.processJobs(readyJobs);
    }

    // Schedule next fetch if no pending jobs
    const pendingJobs = this.jobs.filter(job => job.status === 'pending');
    if (pendingJobs.length === 0) {
      this.scheduleNextFetch();
    }
  }

  /**
   * Process a batch of jobs
   */
  private async processJobs(jobs: FetchJob[]): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    console.log(`[DataScheduler] Processing ${jobs.length} jobs`);

    try {
      // Check rate limits
      const rateLimitStatus = this.alphaVantageService.getRateLimitStatus();
      
      if (!rateLimitStatus.canMakeRequest) {
        console.log('[DataScheduler] Rate limit reached, deferring jobs');
        this.deferJobs(jobs, 60000); // Defer by 1 minute
        return;
      }

      // Process jobs one by one to respect rate limits
      for (const job of jobs) {
        try {
          await this.processJob(job);
          
          // Wait between requests to respect rate limits
          await this.delay(12000); // 12 seconds between requests
          
        } catch (error) {
          console.error(`[DataScheduler] Error processing job ${job.id}:`, error);
          this.handleJobError(job, error as Error);
        }
      }

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: FetchJob): Promise<void> {
    job.status = 'running';
    job.attempts++;

    console.log(`[DataScheduler] Processing job ${job.id} (attempt ${job.attempts})`);

    try {
      switch (job.type) {
        case 'quote':
          await this.alphaVantageService.forceRefresh(job.symbol);
          break;
        
        case 'historical':
          // Historical data is fetched as part of forceRefresh
          break;
        
        case 'company':
          // Company data is fetched as part of forceRefresh
          break;
        
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      job.status = 'completed';
      console.log(`[DataScheduler] Completed job ${job.id}`);

    } catch (error) {
      throw error; // Re-throw to be handled by processJobs
    }
  }

  /**
   * Handle job error and retry logic
   */
  private handleJobError(job: FetchJob, error: Error): void {
    job.error = error.message;

    if (job.attempts < this.config.retryAttempts) {
      // Schedule retry
      job.status = 'pending';
      job.scheduledTime = Date.now() + this.config.retryDelay;
      console.log(`[DataScheduler] Retrying job ${job.id} in ${this.config.retryDelay}ms`);
    } else {
      // Mark as failed
      job.status = 'failed';
      console.error(`[DataScheduler] Job ${job.id} failed after ${job.attempts} attempts`);
    }
  }

  /**
   * Defer jobs to a later time
   */
  private deferJobs(jobs: FetchJob[], delayMs: number): void {
    const newTime = Date.now() + delayMs;
    
    for (const job of jobs) {
      job.scheduledTime = newTime;
    }
    
    console.log(`[DataScheduler] Deferred ${jobs.length} jobs by ${delayMs}ms`);
  }

  /**
   * Utility method to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get scheduler statistics
   */
  public getStats(): SchedulerStats {
    const totalJobs = this.jobs.length;
    const completedJobs = this.jobs.filter(j => j.status === 'completed').length;
    const failedJobs = this.jobs.filter(j => j.status === 'failed').length;
    const pendingJobs = this.jobs.filter(j => j.status === 'pending').length;
    
    const rateLimitStatus = this.alphaVantageService.getRateLimitStatus();
    
    const nextPendingJob = this.jobs
      .filter(j => j.status === 'pending')
      .sort((a, b) => a.scheduledTime - b.scheduledTime)[0];
    
    const lastCompletedJob = this.jobs
      .filter(j => j.status === 'completed')
      .sort((a, b) => b.scheduledTime - a.scheduledTime)[0];

    return {
      totalJobs,
      completedJobs,
      failedJobs,
      pendingJobs,
      requestsToday: rateLimitStatus.requestsToday,
      nextScheduledFetch: nextPendingJob?.scheduledTime || 0,
      lastSuccessfulFetch: lastCompletedJob?.scheduledTime || 0
    };
  }

  /**
   * Get all jobs with optional filtering
   */
  public getJobs(filter?: {
    status?: FetchJob['status'];
    symbol?: string;
    type?: FetchJob['type'];
  }): FetchJob[] {
    let filteredJobs = [...this.jobs];

    if (filter) {
      if (filter.status) {
        filteredJobs = filteredJobs.filter(j => j.status === filter.status);
      }
      if (filter.symbol) {
        filteredJobs = filteredJobs.filter(j => j.symbol === filter.symbol);
      }
      if (filter.type) {
        filteredJobs = filteredJobs.filter(j => j.type === filter.type);
      }
    }

    return filteredJobs.sort((a, b) => b.scheduledTime - a.scheduledTime);
  }

  /**
   * Clear completed and failed jobs older than specified age
   */
  public cleanupOldJobs(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;
    const initialCount = this.jobs.length;
    
    this.jobs = this.jobs.filter(job => {
      if (job.status === 'pending' || job.status === 'running') {
        return true; // Keep pending and running jobs
      }
      return job.scheduledTime > cutoff; // Keep recent completed/failed jobs
    });

    const cleaned = initialCount - this.jobs.length;
    if (cleaned > 0) {
      console.log(`[DataScheduler] Cleaned up ${cleaned} old jobs`);
    }
  }

  /**
   * Force immediate data fetch for specific symbols
   */
  public async forceImmediateFetch(symbols: string[]): Promise<void> {
    if (this.isRunning) {
      throw new Error('Scheduler is currently running, cannot force immediate fetch');
    }

    const rateLimitStatus = this.alphaVantageService.getRateLimitStatus();
    const maxRequests = Math.min(symbols.length, rateLimitStatus.requestsRemaining);

    if (maxRequests === 0) {
      throw new Error('No API requests remaining today');
    }

    console.log(`[DataScheduler] Force fetching data for ${maxRequests} symbols`);

    const jobs: FetchJob[] = symbols.slice(0, maxRequests).map(symbol => ({
      id: `force-${symbol}-${Date.now()}`,
      symbol,
      type: 'quote',
      scheduledTime: Date.now(),
      attempts: 0,
      status: 'pending'
    }));

    this.jobs.push(...jobs);
    await this.processJobs(jobs);
  }

  /**
   * Get next scheduled fetch time
   */
  public getNextScheduledFetch(): Date | null {
    const nextJob = this.jobs
      .filter(j => j.status === 'pending')
      .sort((a, b) => a.scheduledTime - b.scheduledTime)[0];

    return nextJob ? new Date(nextJob.scheduledTime) : null;
  }

  /**
   * Enable or disable the scheduler
   */
  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    
    if (enabled) {
      this.startScheduler();
      this.scheduleNextFetch();
    } else {
      this.stopScheduler();
      // Cancel pending jobs
      this.jobs = this.jobs.filter(j => j.status !== 'pending');
    }
    
    console.log(`[DataScheduler] Scheduler ${enabled ? 'enabled' : 'disabled'}`);
  }
}