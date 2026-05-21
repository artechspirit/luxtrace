import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

async function main() {
  const { nfcService } = await import('../services/nfc.service')
  const { supabase } = await import('../lib/supabase')

  const productId = '9269e483-709e-46c0-ae30-823605e1a869'
  const inputUid = '4f966c58-757a-4699-861e-e03c9a6d5dde'

  console.log('Testing verifyForProduct...')
  const result = await nfcService.verifyForProduct(productId, inputUid)
  console.log('Result:', result)

  // Print tag detail
  const { data: tag } = await supabase.from('nfc_tags').select('*').eq('product_id', productId).single()
  console.log('Stored tag:', tag)
}

main().catch(console.error)
