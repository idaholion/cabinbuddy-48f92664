// Production logging configuration
interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  DEBUG: 'debug';
}

const LOG_LEVELS: LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

interface LogEntry {
  level: keyof LogLevel;
  message: string;
  timestamp: number;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  route?: string;
}

class ProductionLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  private createLogEntry(
    level: keyof LogLevel,
    message: string,
    context?: Record<string, any>
  ): LogEntry {
    return {
      level,
      message,
      timestamp: Date.now(),
      context,
      route: window.location.pathname,
    };
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry);
    
    // Keep only the latest logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // In production, send to monitoring service
    if (!this.isDevelopment) {
      this.sendToMonitoringService(entry);
    }
  }

  private sendToMonitoringService(entry: LogEntry) {
    // TODO: Implement actual monitoring service integration
    // Examples: Sentry, LogRocket, DataDog, etc.
  }

  error(message: string, context?: Record<string, any>) {
    const entry = this.createLogEntry('ERROR', message, context);
    this.addLog(entry);
    
    if (this.isDevelopment) {
      console.error(`🚨 ${message}`, context || '');
    }
  }

  warn(message: string, context?: Record<string, any>) {
    const entry = this.createLogEntry('WARN', message, context);
    this.addLog(entry);
    
    if (this.isDevelopment) {
      console.warn(`⚠️ ${message}`, context || '');
    }
  }

  info(message: string, context?: Record<string, any>) {
    const entry = this.createLogEntry('INFO', message, context);
    this.addLog(entry);
    
    if (this.isDevelopment) {
      console.info(`ℹ️ ${message}`, context || '');
    }
  }

  debug(message: string, context?: Record<string, any>) {
    const entry = this.createLogEntry('DEBUG', message, context);
    this.addLog(entry);
    
    if (this.isDevelopment) {
      console.debug(`🐛 ${message}`, context || '');
    }
  }

  // Get recent logs for debugging
  getRecentLogs(limit = 100): LogEntry[] {
    return this.logs.slice(-limit);
  }

  // Clear logs (useful for testing)
  clearLogs() {
    this.logs = [];
  }
}

// Export singleton instance
export const logger = new ProductionLogger();

// Helper function to replace console.log usage
export const devLog = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
};

// Helper function to replace console.error usage
export const devError = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(...args);
  }
};
