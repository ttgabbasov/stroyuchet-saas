// ============================================
// СтройУчёт - Logger
// ============================================
// Использует простой console.log для dev,
// можно заменить на Pino/Winston для production
// ============================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    
    let contextStr = '';
    if (context) {
        // Redact sensitive keys
        const safeContext = JSON.parse(JSON.stringify(context, (key, value) => {
            if (/password|token|secret|authorization|key/i.test(key)) {
                return '***REDACTED***';
            }
            return value;
        }));
        contextStr = ` ${JSON.stringify(safeContext)}`;
    }
    
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, context));
    }
  }

  // HTTP request logger
  request(req: { method: string; path: string; ip?: string }): void {
    this.info(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: (req as any).headers?.['user-agent'],
    });
  }

  // Database query logger (for development)
  query(query: string, params?: any): void {
    if (this.isDevelopment) {
      this.debug('Database query', { query, params });
    }
  }
}

export const logger = new Logger();
