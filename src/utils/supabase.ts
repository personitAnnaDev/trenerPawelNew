import { createClient } from '@supabase/supabase-js'

// P1-OPS-012: Environment variable validation
// Fail fast if required environment variables are missing
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || typeof supabaseUrl !== 'string' || !supabaseUrl.startsWith('https://')) {
  throw new Error(
    'Missing or invalid VITE_SUPABASE_URL environment variable. ' +
    'Please check your .env file and ensure it contains a valid Supabase URL.'
  )
}

if (!supabaseAnonKey || typeof supabaseAnonKey !== 'string' || supabaseAnonKey.length < 30) {
  throw new Error(
    'Missing or invalid VITE_SUPABASE_ANON_KEY environment variable. ' +
    'Please check your .env file and ensure it contains a valid Supabase anon key.'
  )
}

// P1-SEC-006: Supabase client with security headers
// - X-Client-Info header helps with request tracking and security auditing
// - persistSession and autoRefreshToken ensure proper session management
// - detectSessionInUrl handles OAuth redirects securely
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // Use PKCE flow for enhanced security
  },
  global: {
    headers: {
      'X-Client-Info': 'trener-pawel-web/1.0.0',
    },
  },
})
