const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, products(*)')
    .eq('buyer_id', 'e656cedb-15e4-4195-a58e-93b5af4b3ac4')
    .eq('status', 'PENDING');

  if (error) {
    console.error('Error fetching transactions:', error);
    return;
  }

  console.log(`Pending transactions for artechspirit@gmail.com: ${data.length}`);
  data.forEach((tx) => {
    console.log(`ID: ${tx.transaction_id} | Type: ${tx.type} | Amount: ${tx.amount_idr}`);
  });
}

main();
