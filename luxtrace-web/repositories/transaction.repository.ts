import { supabase } from '@/lib/supabase'
import type { Transaction, TransactionType, TransactionStatus } from '@/types'

export const transactionRepository = {
  async findById(transactionId: string): Promise<Transaction | null> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('transaction_id', transactionId)
      .single()

    if (error) return null
    return data as Transaction
  },

  async findByPaymentRef(paymentRef: string): Promise<Transaction | null> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('payment_ref', paymentRef)
      .single()

    if (error) return null
    return data as Transaction
  },

  async create(payload: {
    type: TransactionType
    product_id: string
    seller_id: string | null
    buyer_id: string
    amount_idr: number
    payment_ref?: string
  }): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .insert({ ...payload, status: 'PENDING' })
      .select()
      .single()

    if (error) throw new Error(`transactionRepository.create: ${error.message}`)
    return data as Transaction
  },

  async updateStatus(
    transactionId: string,
    status: TransactionStatus,
    extra?: Partial<Pick<Transaction, 'blockchain_tx_hash' | 'completed_at'>>
  ): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .update({ status, ...extra })
      .eq('transaction_id', transactionId)
      .select()
      .single()

    if (error) throw new Error(`transactionRepository.updateStatus: ${error.message}`)
    return data as Transaction
  },

  /**
   * Persist Midtrans order_id as payment_ref after invoice creation.
   * This is the idempotency key for webhook processing.
   */
  async setPaymentRef(transactionId: string, paymentRef: string): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .update({ payment_ref: paymentRef })
      .eq('transaction_id', transactionId)

    if (error) throw new Error(`transactionRepository.setPaymentRef: ${error.message}`)
  },

  async findAll(): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw new Error(`transactionRepository.findAll: ${error.message}`)
    return (data ?? []) as Transaction[]
  },
}


