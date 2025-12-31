import { beforeAll, afterAll, afterEach } from 'vitest'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

// Verify required env vars are set
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required environment variables. Make sure .env.local is configured.')
}

beforeAll(async () => {
  // Global setup
})

afterEach(async () => {
  // Cleanup after each test
})

afterAll(async () => {
  // Global teardown
})
