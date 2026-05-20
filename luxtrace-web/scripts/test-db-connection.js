const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Read env file manually
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

  const supabaseUrl = env.SUPABASE_URL
  const supabaseServiceKey = env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  async function test() {
    console.log('Testing Supabase Connection...')
    console.log('URL:', supabaseUrl)
    try {
      const { data, error } = await supabase.auth.admin.listUsers()
      if (error) {
        console.error('❌ Supabase Auth Error:', error.message)
        console.error(error)
      } else {
        console.log('✅ Success! Connected to Supabase Auth.')
        console.log(`Found ${data.users.length} users.`)
      }
    } catch (err) {
      console.error('❌ Uncaught connection error:', err)
    }
  }

  test()
} catch (e) {
  console.error('❌ Failed to read .env file:', e.message)
}
