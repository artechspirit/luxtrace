import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Profile } from '@/types'
import { authService } from '@/services/auth.service'

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

  let { data: profile } = await client
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    try {
      console.log(`[getAuthenticatedUser] Profile missing for user ${user.id}. Provisioning on-the-fly...`)
      profile = (await authService.getMe(user.id)) as any
    } catch (e) {
      console.error('[getAuthenticatedUser] Failed to provision profile:', e)
      return null
    }
  }

  return profile as Profile | null
}
