// lib/env.ts - 环境变量验证

import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXTAUTH_SECRET: z.string().min(16, 'NEXTAUTH_SECRET must be at least 16 characters'),
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL').optional(),
  OPENROUTER_API_KEY: z.string().min(10, 'OPENROUTER_API_KEY is required'),
  BLOB_READ_WRITE_TOKEN: z.string().min(10, 'BLOB_READ_WRITE_TOKEN is required'),
  DATABASE_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
})

export type Env = z.infer<typeof envSchema>

let cachedEnv: Env | null = null

export function validateEnv(): Env {
  if (cachedEnv) return cachedEnv

  try {
    const parsed = envSchema.parse(process.env)
    console.log('[Env] ✓ Environment variables validated')
    cachedEnv = parsed
    return parsed
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[Env] ✗ Environment validation failed:')
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
      // 在开发环境不退出，只警告
      if (process.env.NODE_ENV === 'production') {
        console.error('\nPlease check your environment variables')
        process.exit(1)
      }
    }
    // 返回默认值以便开发
    return {
      NODE_ENV: 'development',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'dev-secret-key-change-in-production',
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
      BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN || '',
      LOG_LEVEL: 'info',
    } as Env
  }
}

// 延迟验证，避免在模块加载时就验证
export const getEnv = () => validateEnv()
