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

  async function test() {
    console.log('Querying profiles table...')
    try {
      const { data, error } = await supabase.from('profiles').select('*')
      if (error) {
        console.error('❌ Error fetching profiles:', error.message)
        console.error(error)
      } else {
        console.log('✅ Connected! Profiles count:', data.length)
        console.log('Profiles list:', data)
      }
    } catch (err) {
      console.error('❌ Uncaught query error:', err)
    }
  }

  test()
} catch (e) {
  console.error('❌ Failed to read .env file:', e.message)
}
