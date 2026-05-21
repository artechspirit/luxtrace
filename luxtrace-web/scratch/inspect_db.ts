import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

async function main() {
  const { supabase } = await import('../lib/supabase')
  console.log('--- Inspecting Database ---')
  
  const { data: txs, error: txErr } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  if (txErr) {
    console.error('Error fetching transactions:', txErr)
    return
  }

  console.log('\n=== Transactions ===')
  for (const tx of txs || []) {
    console.log(`TX ID: ${tx.transaction_id} | Type: ${tx.type} | Status: ${tx.status} | Product: ${tx.product_id}`)
  }
}

main().catch(console.error)
