// ============================================
// СтройУчёт - Rate Limiting Middleware
// ============================================

import { Request, Response } from 'express';

// ============================================
// RATE LIMITER CLASS
// ============================================

interface RateLimiterOptions {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}

export class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private options: RateLimiterOptions) {
    // Cleanup old entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  private getKey(req: Request): string {
    // Use IP address or user ID if authenticated
    return (req as any).user?.userId || req.ip || 'unknown';
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.requests.entries()) {
      if (value.resetTime < now) {
        this.requests.delete(key);
      }
    }
  }

  middleware() {
    return (req: Request, res: Response, next: () => void): void => {
      // Skip rate limiting in development mode
      if (process.env.NODE_ENV === 'development') {
        next();
        return;
      }

      const key = this.getKey(req);
      const now = Date.now();
      const record = this.requests.get(key);

      if (!record || record.resetTime < now) {
        // New window or expired
        this.requests.set(key, {
          count: 1,
          resetTime: now + this.options.windowMs,
        });
        next();
        return;
      }

      if (record.count >= this.options.max) {
        // Rate limit exceeded
        const retryAfter = Math.ceil((record.resetTime - now) / 1000);
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: this.options.message || 'Превышен лимит запросов',
          },
          retryAfter,
        });
        return;
      }

      // Increment count
      record.count++;
      next();
    };
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.requests.clear();
  }
}

// ============================================
// RATE LIMITER INSTANCES
// ============================================

// General API rate limiter
export const apiLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 100 requests per window
  message: 'Слишком много запросов, попробуйте позже',
});

// Auth endpoints rate limiter (stricter)
export const authLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 5 requests per window
  message: 'Слишком много попыток входа, попробуйте через 15 минут',
});

// File upload rate limiter
export const uploadLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: 'Превышен лимит загрузок, попробуйте через час',
});
