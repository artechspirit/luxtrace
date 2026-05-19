import { supabase } from '@/lib/supabase'

export type BatchStatus = 'PROCESSING' | 'COMPLETED' | 'PARTIALLY_FAILED' | 'FAILED'

export interface BatchResult {
  serial_number: string
  product_id: string
  nft_token_id: string
  tx_hash: string
  nfc_bound: boolean
}

export interface BatchRecord {
  batch_id: string
  status: BatchStatus
  total_submitted: number
  processed: number
  results: BatchResult[]
  failed: Array<{ serial_number: string; reason: string }>
  created_by: string
  created_at: string
  completed_at: string | null
}

export const batchRepository = {
  async create(payload: {
    batch_id: string
    total_submitted: number
    created_by: string
  }): Promise<void> {
    const { error } = await supabase.from('manufacturing_batches').insert({
      batch_id: payload.batch_id,
      status: 'PROCESSING',
      total_submitted: payload.total_submitted,
      processed: 0,
      results: [],
      failed: [],
      created_by: payload.created_by,
    })

    if (error) throw new Error(`batchRepository.create: ${error.message}`)
  },

  async findById(batchId: string): Promise<BatchRecord | null> {
    const { data, error } = await supabase
      .from('manufacturing_batches')
      .select('*')
      .eq('batch_id', batchId)
      .single()

    if (error) return null
    return data as BatchRecord
  },

  async appendResult(batchId: string, result: BatchResult): Promise<void> {
    // Use Supabase RPC for atomic append to results array
    const { error } = await supabase.rpc('batch_append_result', {
      p_batch_id: batchId,
      p_result: result,
    })

    if (error) throw new Error(`batchRepository.appendResult: ${error.message}`)
  },

  async appendFailed(batchId: string, serial: string, reason: string): Promise<void> {
    const { error } = await supabase.rpc('batch_append_failed', {
      p_batch_id: batchId,
      p_serial: serial,
      p_reason: reason,
    })

    if (error) throw new Error(`batchRepository.appendFailed: ${error.message}`)
  },

  async markCompleted(batchId: string, status: BatchStatus): Promise<void> {
    const { error } = await supabase
      .from('manufacturing_batches')
      .update({
        status,
        completed_at: new Date().toISOString(),
      })
      .eq('batch_id', batchId)

    if (error) throw new Error(`batchRepository.markCompleted: ${error.message}`)
  },
}
