const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

try {
  const envContent = fs.readFileSync('.env', 'utf8')
  const env = {}
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (match) {
      const key = match[1]
      let value = match[2] || ''
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
      env[key] = value
    }
  })

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

  async function clean() {
    console.log('Clearing products, manufacturing batches, and related logs...')
    try {
      // 1. Delete all logs
      const { error: logErr } = await supabase.from('product_logs').delete().neq('log_id', '00000000-0000-0000-0000-000000000000')
      if (logErr) console.warn('Note deleting logs:', logErr.message)

      // 2. Delete all batches
      const { error: batchErr } = await supabase.from('manufacturing_batches').delete().neq('batch_id', '00000000-0000-0000-0000-000000000000')
      if (batchErr) console.warn('Note deleting batches:', batchErr.message)

      // 3. Delete all products (this will cascade delete nfc_tags and sessions due to ON DELETE CASCADE)
      const { error: prodErr } = await supabase.from('products').delete().neq('product_id', '00000000-0000-0000-0000-000000000000')
      
      if (prodErr) {
        console.error('❌ Failed to delete products:', prodErr.message)
      } else {
        console.log('----------------------------------------------------')
        console.log('✅ Database Cleared! All products, logs, and batches have been reset.')
        console.log('----------------------------------------------------')
      }
    } catch (err) {
      console.error('❌ Uncaught error during cleanup:', err)
    }
  }

  clean()
} catch (e) {
  console.error('❌ Failed to read .env file:', e.message)
}
