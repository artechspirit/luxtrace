import { supabase } from '@/lib/supabase'
import type { Profile, UserRole } from '@/types'

export const profileRepository = {
  async findByUserId(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) return null
    return data as Profile
  },

  async findByEmail(email: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single()

    if (error) return null
    return data as Profile
  },

  async create(payload: {
    user_id: string
    email: string
    wallet_address: string
    role: UserRole
    full_name: string | null
    avatar_url: string | null
  }): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .insert(payload)
      .select()
      .single()

    if (error) throw new Error(`profileRepository.create: ${error.message}`)
    return data as Profile
  },

  async updateRole(userId: string, role: UserRole): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw new Error(`profileRepository.updateRole: ${error.message}`)
    return data as Profile
  },
}
