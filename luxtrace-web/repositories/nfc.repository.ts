import { supabase } from '@/lib/supabase'
import type { NfcTag } from '@/types'

export const nfcRepository = {
  async findByProductId(productId: string): Promise<NfcTag | null> {
    const { data, error } = await supabase
      .from('nfc_tags')
      .select('*')
      .eq('product_id', productId)
      .single()

    if (error) return null
    return data as NfcTag
  },

  async findByHash(secureKeyHash: string): Promise<NfcTag | null> {
    const { data, error } = await supabase
      .from('nfc_tags')
      .select('*')
      .eq('secure_key_hash', secureKeyHash)
      .single()

    if (error) return null
    return data as NfcTag
  },

  async create(nfcUid: string, secureKeyHash: string, productId: string): Promise<NfcTag> {
    const { data, error } = await supabase
      .from('nfc_tags')
      .insert({ nfc_uid: nfcUid, secure_key_hash: secureKeyHash, product_id: productId })
      .select()
      .single()

    if (error) throw new Error(`nfcRepository.create: ${error.message}`)
    return data as NfcTag
  },
}
