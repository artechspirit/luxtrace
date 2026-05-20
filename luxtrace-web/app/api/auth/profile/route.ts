import { NextRequest } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { ok, unauthorized, serverError, err } from '@/lib/response'
import { supabase } from '@/lib/supabase'

/**
 * PUT /api/auth/profile
 * 
 * Updates the profile metadata (repurposing avatar_url for storing push token).
 * Headers: Authorization: Bearer <access_token>
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return unauthorized()

    const body = await request.json()
    const { avatar_url } = body

    if (avatar_url === undefined) {
      return err('INVALID_PAYLOAD', 'avatar_url is required', 422)
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ avatar_url, updated_at: new Date().toISOString() })
      .eq('user_id', user.user_id)
      .select()
      .single()

    if (error) {
      return err('DATABASE_ERROR', error.message, 500)
    }

    return ok({
      user_id: data.user_id,
      email: data.email,
      full_name: data.full_name,
      avatar_url: data.avatar_url,
      wallet_address: data.wallet_address,
      role: data.role,
      created_at: data.created_at,
    })
  } catch (error: unknown) {
    console.error('[PUT /api/auth/profile]', error)
    return serverError()
  }
}
