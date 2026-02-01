// ============================================
// СтройУчёт - Environment Variables Validation
// ============================================

import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('4000'), // Keep 4000 as per old default
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required').startsWith('postgresql://', 'DATABASE_URL must start with postgresql://'),

  // Auth
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),

  // Storage
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.string().transform(Number).default('10485760'), // 10MB

  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN is required'),

  // AI
  GOOGLE_API_KEY: z.string().optional(),
});

// Validate env vars
const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(_env.error.format(), null, 2));
  throw new Error('Invalid environment variables');
}

export const env = _env.data;
