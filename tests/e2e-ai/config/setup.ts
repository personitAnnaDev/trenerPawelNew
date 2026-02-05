/**
 * Setup file for E2E AI Optimization Tests
 *
 * This file runs before all E2E AI tests to:
 * 1. Load environment variables from .env.e2e-ai
 * 2. Validate required credentials
 * 3. Initialize global test context
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.e2e-ai file
const envPath = resolve(__dirname, '../../../.env.e2e-ai')
config({ path: envPath })

// Validate required environment variables
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_TEST_USER_EMAIL',
  'VITE_TEST_USER_PASSWORD',
]

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(
      `❌ Missing required environment variable: ${envVar}\n\n` +
      `Please create .env.e2e-ai file and add:\n` +
      `${envVar}=your_value_here\n\n` +
      `See .env.e2e-ai.example for template.`
    )
  }
}

console.log('✅ E2E AI Test Environment Loaded')
console.log(`   Supabase URL: ${process.env.VITE_SUPABASE_URL}`)
console.log(`   Test User: ${process.env.VITE_TEST_USER_EMAIL}`)
console.log(`   Timeout: ${process.env.E2E_AI_TIMEOUT || '300000'}ms`)
console.log('')
