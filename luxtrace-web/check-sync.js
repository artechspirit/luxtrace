const { createClient } = require('@supabase/supabase-js');
const Midtrans = require('midtrans-client');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const coreApi = new Midtrans.CoreApi({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

async function run() {
  const { data: tx } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'P2P_REMOTE_SHIPPING')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  console.log("Latest TX:", tx);

  if (tx && tx.payment_ref) {
    try {
      console.log("Checking status for payment_ref:", tx.payment_ref);
      const status = await coreApi.transaction.status(tx.payment_ref);
      console.log("Midtrans Status:", status);
    } catch (err) {
      console.log("Midtrans Error:", err.message);
    }
  }
}
run();
