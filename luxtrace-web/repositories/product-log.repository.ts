import { supabase } from '@/lib/supabase'
import type { ProductLog, ProductLogEvent } from '@/types'

export const productLogRepository = {
  async findByProductId(productId: string): Promise<ProductLog[]> {
    const { data, error } = await supabase
      .from('product_logs')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: true })

    if (error) throw new Error(`productLogRepository.findByProductId: ${error.message}`)
    return (data ?? []) as ProductLog[]
  },

  async insert(payload: {
    product_id: string
    event: ProductLogEvent
    actor_id?: string | null
    actor_role?: string | null
    metadata?: Record<string, unknown>
  }): Promise<void> {
    const { error } = await supabase.from('product_logs').insert({
      product_id: payload.product_id,
      event: payload.event,
      actor_id: payload.actor_id ?? null,
      actor_role: payload.actor_role ?? null,
      metadata: payload.metadata ?? {},
    })

    if (error) throw new Error(`productLogRepository.insert: ${error.message}`)
  },
}
