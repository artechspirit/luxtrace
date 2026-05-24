require('dotenv').config({ path: 'luxtrace-web/.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
async function run() {
  const { data, error } = await supabase.from('transactions').select('transaction_id, payment_ref, status, amount_idr, created_at, type').order('created_at', { ascending: false }).limit(5);
  console.log(data);
}
run();
