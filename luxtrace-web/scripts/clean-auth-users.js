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
  const EMAILS_TO_DELETE = ['admin@luxtrace.com', 'operator@luxtrace.com', 'buyer@luxtrace.com']

  async function clean() {
    console.log('Cleaning up existing Supabase Auth users...')
    try {
      // 1. Get all users
      const { data: { users }, error } = await supabase.auth.admin.listUsers()
      if (error) {
        console.error('❌ Error listing users:', error.message)
        process.exit(1)
      }

      // 2. Filter and delete
      let deletedCount = 0
      for (const user of users) {
        if (EMAILS_TO_DELETE.includes(user.email)) {
          console.log(`Deleting ${user.email} (ID: ${user.id})...`)
          const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
          if (deleteError) {
            console.error(`❌ Failed to delete ${user.email}:`, deleteError.message)
          } else {
            console.log(`✅ Deleted ${user.email}`)
            deletedCount++
          }
        }
      }

      console.log(`----------------------------------------------------`)
      console.log(`Cleanup finished. Deleted ${deletedCount} users.`)
      console.log(`----------------------------------------------------`)
    } catch (err) {
      console.error('❌ Uncaught error during cleanup:', err)
    }
  }

  clean()
} catch (e) {
  console.error('❌ Failed to read .env file:', e.message)
}
