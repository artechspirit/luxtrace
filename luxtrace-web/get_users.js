const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vjfhvsazjaxadkryfuzp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqZmh2c2F6amF4YWRrcnlmdXpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODk2ODgzOCwiZXhwIjoyMDk0NTQ0ODM4fQ.8bMSXjmcu4ahlvTd3TK23WBeUgCW1C8EPDp6hu4sW8Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function getUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, email, full_name, role, wallet_address');
  
  if (error) {
    console.error('Error fetching users:', error);
  } else {
    console.log('--- REGISTERED PROFILES ---');
    console.log(JSON.stringify(data, null, 2));
  }
}

getUsers();
