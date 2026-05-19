import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('[ENV] SUPABASE_URL and SUPABASE_SERVICE_KEY are required')
}

/**
 * Server-only Supabase client with service role key.
 * Bypasses Row Level Security — use only in server-side code.
 * Never expose to client.
 */
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
