import { supabase } from '@/lib/supabase'

export interface QrSession {
  session_id: string
  transaction_id: string
  product_id: string
  encrypted_payload: string
  is_used: boolean
  expires_at: string
  created_at: string
}

export const qrSessionRepository = {
  /**
   * Persist a QR session. One session per transaction.
   * Upserts — replaces previous session if seller re-requests QR.
   */
  async upsert(payload: {
    session_id: string
    transaction_id: string
    product_id: string
    encrypted_payload: string
    expires_at: string
  }): Promise<void> {
    const { error } = await supabase
      .from('qr_sessions')
      .upsert(
        {
          ...payload,
          is_used: false,
        },
        { onConflict: 'transaction_id' } // one active session per transaction
      )

    if (error) throw new Error(`qrSessionRepository.upsert: ${error.message}`)
  },

  async findBySessionId(sessionId: string): Promise<QrSession | null> {
    const { data, error } = await supabase
      .from('qr_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    if (error) return null
    return data as QrSession
  },

  async findByTransactionId(transactionId: string): Promise<QrSession | null> {
    const { data, error } = await supabase
      .from('qr_sessions')
      .select('*')
      .eq('transaction_id', transactionId)
      .eq('is_used', false)
      .single()

    if (error) return null
    return data as QrSession
  },

  /**
   * Mark session as consumed — single-use enforcement.
   * Must be called atomically before processing verification.
   */
  async markUsed(sessionId: string): Promise<boolean> {
    // Atomic: only update if still unused
    const { data, error } = await supabase
      .from('qr_sessions')
      .update({ is_used: true })
      .eq('session_id', sessionId)
      .eq('is_used', false) // guard: only unused sessions
      .select('session_id')
      .single()

    if (error || !data) return false // already used or not found
    return true
  },

  async resetSession(sessionId: string): Promise<void> {
    await supabase
      .from('qr_sessions')
      .update({ is_used: false })
      .eq('session_id', sessionId)
  },
}
