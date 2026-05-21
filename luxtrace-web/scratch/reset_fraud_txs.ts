import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

async function main() {
  const { supabase } = await import('../lib/supabase')
  console.log('--- Resetting FRAUD_FLAGGED Transactions ---')

  // Find all FRAUD_FLAGGED transactions
  const { data: txs, error: txErr } = await supabase
    .from('transactions')
    .select('transaction_id, product_id, status')
    .eq('status', 'FRAUD_FLAGGED')

  if (txErr) {
    console.error('Error fetching transactions:', txErr)
    return
  }

  if (!txs || txs.length === 0) {
    console.log('No FRAUD_FLAGGED transactions found to reset.')
    return
  }

  console.log(`Found ${txs.length} transactions in FRAUD_FLAGGED state. Resetting...`)

  for (const tx of txs) {
    // Reset transaction status to PENDING
    const { error: updateErr } = await supabase
      .from('transactions')
      .update({ status: 'PENDING' })
      .eq('transaction_id', tx.transaction_id)

    if (updateErr) {
      console.error(`Failed to reset transaction ${tx.transaction_id}:`, updateErr)
      continue
    }

    // Reset QR sessions for this transaction to is_used = false
    const { error: sessionErr } = await supabase
      .from('qr_sessions')
      .update({ is_used: false })
      .eq('transaction_id', tx.transaction_id)

    if (sessionErr) {
      console.error(`Failed to reset QR session for transaction ${tx.transaction_id}:`, sessionErr)
    }

    console.log(`Reset transaction ${tx.transaction_id} and its QR sessions.`)
  }

  console.log('Done!')
}

main().catch(console.error)
