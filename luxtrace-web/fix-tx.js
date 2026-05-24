const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function run() {
  const txId = '957fce43-917d-4ca9-9f8d-3d92c780549d';
  console.log("Fixing TX:", txId);
  const { data, error } = await supabase.from('transactions').update({ status: 'PAID' }).eq('transaction_id', txId);
  console.log("Update Error:", error);
  console.log("Done");
}
run();
