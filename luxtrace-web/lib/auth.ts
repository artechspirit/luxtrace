import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Profile } from '@/types'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!

/**
 * Verify the Bearer JWT from the request header.
 * Returns the authenticated profile or null.
 *
 * Uses anon key so RLS policies apply to the token owner.
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<Profile | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.replace('Bearer ', '')

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: { user }, error } = await client.auth.getUser()
  if (error || !user) return null

  const { data: profile } = await client
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return profile as Profile | null
}
