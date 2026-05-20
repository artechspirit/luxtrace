const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    env[match[1]] = (match[2] || '').replace(/['"]/g, '').trim();
  }
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('product_id, serial_number, brand, name, status, current_owner_id');
  
  if (error) {
    console.error('Error fetching products:', error);
  } else {
    console.log('--- PRODUCTS IN DATABASE ---');
    console.log(JSON.stringify(data, null, 2));
  }
}

getProducts();
